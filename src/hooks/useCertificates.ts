import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  certificateValidationSchema,
  myCertificatesSchema,
  type CertificateValidation,
} from "@/contracts/certificates";
import { parseDataContract } from "@/contracts/contract-error";
import {
  paginatedStudentsAdminDashboardSchema,
  type PaginatedStudentsAdminDashboard,
} from "@/contracts/students-admin-pagination";
import { supabase } from "@/integrations/supabase/client";

interface StudentsAdminFilters {
  search: string;
  studentLimit: number;
  studentOffset: number;
  enrollmentLimit: number;
  enrollmentOffset: number;
  certificateLimit: number;
  certificateOffset: number;
}

const certificateKeys = {
  mine: ["certificates", "mine"] as const,
  validation: (code: string) => ["certificates", "validation", code] as const,
  admin: (filters: StudentsAdminFilters) =>
    ["certificates", "admin", filters] as const,
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

export const useStudentsAdminDashboard = (input: {
  search: string;
  studentLimit?: number;
  studentOffset?: number;
  enrollmentLimit?: number;
  enrollmentOffset?: number;
  certificateLimit?: number;
  certificateOffset?: number;
}) => {
  const filters: StudentsAdminFilters = {
    search: input.search.trim(),
    studentLimit: input.studentLimit ?? 25,
    studentOffset: input.studentOffset ?? 0,
    enrollmentLimit: input.enrollmentLimit ?? 25,
    enrollmentOffset: input.enrollmentOffset ?? 0,
    certificateLimit: input.certificateLimit ?? 25,
    certificateOffset: input.certificateOffset ?? 0,
  };

  return useQuery<PaginatedStudentsAdminDashboard>({
    queryKey: certificateKeys.admin(filters),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_students_admin_dashboard", {
        ...(filters.search ? { p_search: filters.search } : {}),
        p_student_limit: filters.studentLimit,
        p_student_offset: filters.studentOffset,
        p_enrollment_limit: filters.enrollmentLimit,
        p_enrollment_offset: filters.enrollmentOffset,
        p_certificate_limit: filters.certificateLimit,
        p_certificate_offset: filters.certificateOffset,
      });
      if (error) throw error;
      return parseDataContract(
        paginatedStudentsAdminDashboardSchema,
        data,
        "administração paginada de alunos e certificados",
      );
    },
  });
};

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
