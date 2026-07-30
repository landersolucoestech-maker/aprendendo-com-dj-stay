import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import {
  fileDownloadInputSchema,
  lessonFileSchema,
  lessonIdSchema,
  type LessonFileRow,
} from "@/contracts/learning";
import { supabase } from "@/integrations/supabase/client";

export type LessonFile = LessonFileRow;

export const useLessonFiles = (aulaId: string) =>
  useQuery({
    queryKey: ["lesson-files", aulaId],
    queryFn: async (): Promise<LessonFile | null> => {
      const validatedLessonId = parseDataContract(
        lessonIdSchema,
        aulaId,
        "identificador da aula para consulta de arquivos",
      );
      const { data, error } = await supabase
        .from("lesson_files")
        .select("*")
        .eq("aula_id", validatedLessonId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data === null ? null : parseDataContract(lessonFileSchema, data, "arquivos da aula");
    },
    enabled: aulaId.length > 0,
  });

export const downloadFileFromStorage = async (
  bucketId: string,
  filePath: string,
  fileName: string,
): Promise<void> => {
  const input = parseDataContract(
    fileDownloadInputSchema,
    { bucketId, filePath, fileName },
    "parâmetros de download de arquivo",
  );
  const { data, error } = await supabase.storage.from(input.bucketId).download(input.filePath);

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error("O storage não retornou o arquivo solicitado.");
  }

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = input.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
