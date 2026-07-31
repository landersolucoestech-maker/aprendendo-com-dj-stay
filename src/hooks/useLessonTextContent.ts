import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { parseDataContract } from "@/contracts/contract-error";
import { uuidSchema } from "@/contracts/learning";
import { supabase } from "@/integrations/supabase/client";

const lessonTextSchema = z
  .object({
    id: uuidSchema,
    conteudo_texto: z.string().nullable(),
  })
  .strict();

export const useLessonTextContent = (lessonId: string, enabled: boolean) =>
  useQuery({
    queryKey: ["lesson-text-content", lessonId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("aulas")
        .select("id,conteudo_texto")
        .eq("id", lessonId)
        .single();

      if (error) throw error;

      return parseDataContract(lessonTextSchema, data, "conteúdo textual da aula").conteudo_texto;
    },
    enabled,
  });
