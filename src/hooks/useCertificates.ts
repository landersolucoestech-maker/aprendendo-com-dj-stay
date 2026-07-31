import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  certificateValidationSchema,
  myCertificatesSchema,
  studentsAdminDashboardSchema,
  type CertificateValidation,
  type StudentsAdminDashboard,
} from "@/contracts/certificates";
import { parseDataContract } from "@/contracts/contract-error";
import { supabase } from "@/integrations/supabase/client";

const certificateKeys = {
  mine: ["certificates", "mine"] as const,
  validation: (code: string) => ["certificates", "validation", code] as const,
  admin: (search: string) => ["certificates", "admin", search] as const,
};

const invalidateCertificateData = async (
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["certificates"] }),
    queryClient.invalidateQueries({ queryKey: ["course-access"] }),
    queryClient.invalidateQueries({ queryKey: ["student-portal"] }),
  ]);
};

export const useMyCertificates = () =>
  useQuery({
    queryKey: certificateKeys.mine,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_certificates");
      if (error) throw error;
      return parseDataContract(myCertificatesSchema, data, "certificados do aluno");
    },
  });

export const useCertificateValidation = (code: string) =>
  useQuery<CertificateValidation>({
    queryKey: certificateKeys.validation(code),
    enabled: /^DJSTAY-[A-F0-9]{20}$/.test(code),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("validate_certificate", {
        p_code: code,
      });
      if (error) throw error;
      return parseDataContract(
        certificateValidationSchema,
        data,
        "validação pública do certificado",
      );
    },
  });

export const useStudentsAdminDashboard = (search: string) =>
  useQuery<StudentsAdminDashboard>({
    queryKey: certificateKeys.admin(search),
    queryFn: async () => {
      const normalizedSearch = search.trim();
      const { data, error } = await supabase.rpc("get_students_admin_dashboard", {
        ...(normalizedSearch ? { p_search: normalizedSearch } : {}),
        p_limit: 100,
        p_offset: 0,
      });
      if (error) throw error;
      return parseDataContract(
        studentsAdminDashboardSchema,
        data,
        "administração de alunos e certificados",
      );
    },
  });

export const useGrantCourseEnrollment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      courseId: string;
      startsAt: string;
      expiresAt: string | null;
      reason: string;
    }) => {
      const { error } = await supabase.rpc("grant_course_enrollment", {
        p_user_id: input.userId,
        p_course_id: input.courseId,
        p_starts_at: input.startsAt,
        ...(input.expiresAt === null ? {} : { p_expires_at: input.expiresAt }),
        p_reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: async () => invalidateCertificateData(queryClient),
  });
};

export const useRenewCourseEnrollment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { enrollmentId: string; expiresAt: string }) => {
      const { error } = await supabase.rpc("renew_course_enrollment", {
        p_enrollment_id: input.enrollmentId,
        p_expires_at: input.expiresAt,
      });
      if (error) throw error;
    },
    onSuccess: async () => invalidateCertificateData(queryClient),
  });
};

export const useSuspendCourseEnrollment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { enrollmentId: string; reason: string }) => {
      const { error } = await supabase.rpc("suspend_course_enrollment", {
        p_enrollment_id: input.enrollmentId,
        p_reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: async () => invalidateCertificateData(queryClient),
  });
};

export const useRevokeCourseEnrollment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { enrollmentId: string; reason: string }) => {
      const { error } = await supabase.rpc("revoke_course_enrollment", {
        p_enrollment_id: input.enrollmentId,
        p_reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: async () => invalidateCertificateData(queryClient),
  });
};

export const useIssueEnrollmentCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase.rpc("issue_enrollment_certificate", {
        p_enrollment_id: enrollmentId,
      });
      if (error) throw error;
    },
    onSuccess: async () => invalidateCertificateData(queryClient),
  });
};

export const useRevokeEnrollmentCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { certificateId: string; reason: string }) => {
      const { error } = await supabase.rpc("revoke_enrollment_certificate", {
        p_certificate_id: input.certificateId,
        p_reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: async () => invalidateCertificateData(queryClient),
  });
};
