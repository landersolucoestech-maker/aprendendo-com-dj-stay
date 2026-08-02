import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { publicConfig } from "@/config/public-config";
import { parseDataContract } from "@/contracts/contract-error";
import { lessonIdSchema } from "@/contracts/learning";
import {
  playbackCredentialsSchema,
  playbackFingerprintSchema,
  playbackGatewayResponseSchema,
  playbackTokenResponseSchema,
  playbackTokenSchema,
  type LessonMediaProvider,
} from "@/contracts/playback";
import { supabase } from "@/integrations/supabase/client";
import { getPlaybackFingerprint } from "@/lib/playback-fingerprint";

export interface LessonPlaybackSession {
  readonly token: string;
  readonly fingerprint: string;
  readonly provider: LessonMediaProvider;
  readonly embedUrl: string | null;
  readonly streamUrl: string | null;
  readonly watermarkText: string | null;
  readonly expiresAt: string;
}

const reasonMessages: Readonly<Record<string, string>> = {
  ACTIVE_ENROLLMENT_REQUIRED: "Sua matrícula não está ativa para esta aula.",
  AUTH_SESSION_REQUIRED: "Sua sessão precisa ser renovada para reproduzir esta aula.",
  INVALID_FINGERPRINT: "Não foi possível validar este dispositivo para reprodução.",
  MEDIA_NOT_AVAILABLE: "A mídia desta aula ainda não está disponível.",
  PRIVATE_MEDIA_OBJECT_UNAVAILABLE: "O arquivo de vídeo não está disponível no momento.",
  ROLE_NOT_ALLOWED: "Seu perfil não possui acesso à reprodução desta aula.",
};

const getReasonMessage = (reason: string | null): string =>
  reason === null
    ? "Não foi possível autorizar a reprodução."
    : reasonMessages[reason] ?? "A reprodução foi negada.";

const resolvePlayback = async (
  token: string,
  fingerprint: string,
): Promise<Omit<LessonPlaybackSession, "token" | "fingerprint">> => {
  const credentials = parseDataContract(
    playbackCredentialsSchema,
    { token, fingerprint },
    "credenciais para resolução do playback",
  );
  const { data, error } = await supabase.functions.invoke("media-playback", {
    body: credentials,
  });

  if (error) throw error;

  const resolved = parseDataContract(
    playbackGatewayResponseSchema,
    data,
    "resolução segura da mídia da aula",
  );

  return {
    provider: resolved.provider,
    embedUrl: resolved.embedUrl,
    streamUrl: resolved.streamUrl,
    watermarkText: resolved.watermarkText,
    expiresAt: resolved.expiresAt,
  };
};

const issuePlayback = async (lessonId: string): Promise<LessonPlaybackSession> => {
  const validatedLessonId = parseDataContract(
    lessonIdSchema,
    lessonId,
    "identificador da aula para reprodução",
  );
  const fingerprint = parseDataContract(
    playbackFingerprintSchema,
    await getPlaybackFingerprint(),
    "fingerprint para emissão do playback",
  );
  const { data, error } = await supabase.rpc("request_lesson_playback_token", {
    p_lesson_id: validatedLessonId,
    p_fingerprint_hash: fingerprint,
  });

  if (error) throw error;

  const [issued] = parseDataContract(
    playbackTokenResponseSchema,
    data,
    "emissão do token de reprodução",
  );

  if (!issued) {
    throw new Error("A emissão do playback não retornou resultado.");
  }

  if (!issued.granted) {
    throw new Error(getReasonMessage(issued.reason));
  }

  if (issued.provider === "private_asset") {
    const query = new URLSearchParams({ token: issued.token, fingerprint });
    return {
      token: issued.token,
      fingerprint,
      provider: issued.provider,
      embedUrl: null,
      streamUrl: `${publicConfig.supabaseUrl}/functions/v1/media-playback?${query.toString()}`,
      watermarkText: issued.watermark_text,
      expiresAt: issued.expires_at,
    };
  }

  const resolved = await resolvePlayback(issued.token, fingerprint);
  return { token: issued.token, fingerprint, ...resolved };
};

const revokePlayback = async (token: string): Promise<void> => {
  const validatedToken = parseDataContract(
    playbackTokenSchema,
    token,
    "token para revogação do playback",
  );
  const { error } = await supabase.rpc("revoke_lesson_playback_token", {
    p_token: validatedToken,
  });
  if (error) console.warn("Não foi possível revogar o token de reprodução.");
};

export const useLessonPlayback = (lessonId: string, enabled = true) => {
  const query = useQuery({
    queryKey: ["lesson-playback", lessonId],
    queryFn: () => issuePlayback(lessonId),
    enabled: enabled && lessonId.length > 0,
    staleTime: 3 * 60 * 1000,
    refetchInterval: enabled ? 4 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const token = query.data?.token;
  useEffect(() => {
    if (!token) return;
    return () => {
      void revokePlayback(token);
    };
  }, [token]);

  return query;
};
