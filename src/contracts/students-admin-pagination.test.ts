import { describe, expect, it } from "vitest";

import {
  paginatedAdminEnrollmentSchema,
  paginatedStudentsAdminDashboardSchema,
} from "@/contracts/students-admin-pagination";

const EMPTY_DASHBOARD = {
  totals: {
    students: 0,
    enrollments: 0,
    certificates: 0,
    valid_certificates: 0,
  },
  students: [],
  courses: [],
  enrollments: [],
  certificates: [],
} as const;

const ENROLLMENT_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const COURSE_ID = "550e8400-e29b-41d4-a716-446655440003";

const PAGINATED_ENROLLMENT = {
  id: ENROLLMENT_ID,
  user_id: USER_ID,
  student_name: "Aluno Exemplo",
  student_email: "aluno@example.com",
  course_id: COURSE_ID,
  course_title: "Curso Exemplo",
  status: "active",
  source: "manual_grant",
  starts_at: "2026-08-03T00:00:00-03:00",
  expires_at: null,
  status_reason: null,
  completion: {
    enrollment_id: ENROLLMENT_ID,
    user_id: USER_ID,
    course_id: COURSE_ID,
    course_title: "Curso Exemplo",
    enrollment_status: "active",
    completion_mode: "manual",
    certificate_enabled: true,
    minimum_percent: 100,
    total_lessons: 0,
    completed_lessons: 0,
    completion_percent: 0,
    eligible: true,
  },
  active_certificate_id: null,
  active_certificate_code: null,
} as const;

describe("paginatedAdminEnrollmentSchema", () => {
  it("aceita identidade do titular junto da matrícula paginada", () => {
    expect(paginatedAdminEnrollmentSchema.parse(PAGINATED_ENROLLMENT)).toEqual(
      PAGINATED_ENROLLMENT,
    );
  });

  it("rejeita matrícula paginada sem nome ou com e-mail inválido", () => {
    expect(
      paginatedAdminEnrollmentSchema.safeParse({
        ...PAGINATED_ENROLLMENT,
        student_name: "",
      }).success,
    ).toBe(false);
    expect(
      paginatedAdminEnrollmentSchema.safeParse({
        ...PAGINATED_ENROLLMENT,
        student_email: "email-invalido",
      }).success,
    ).toBe(false);
  });
});

describe("paginatedStudentsAdminDashboardSchema", () => {
  it("aceita snapshot paginado vazio e coerente", () => {
    expect(paginatedStudentsAdminDashboardSchema.parse(EMPTY_DASHBOARD)).toEqual(
      EMPTY_DASHBOARD,
    );
  });

  it("aceita totais maiores que as páginas carregadas", () => {
    expect(
      paginatedStudentsAdminDashboardSchema.safeParse({
        ...EMPTY_DASHBOARD,
        totals: {
          students: 100,
          enrollments: 250,
          certificates: 80,
          valid_certificates: 60,
        },
      }).success,
    ).toBe(true);
  });

  it("rejeita certificados válidos acima do total", () => {
    expect(
      paginatedStudentsAdminDashboardSchema.safeParse({
        ...EMPTY_DASHBOARD,
        totals: {
          students: 0,
          enrollments: 0,
          certificates: 1,
          valid_certificates: 2,
        },
      }).success,
    ).toBe(false);
  });

  it("rejeita página maior que o total filtrado", () => {
    expect(
      paginatedStudentsAdminDashboardSchema.safeParse({
        ...EMPTY_DASHBOARD,
        totals: {
          students: 0,
          enrollments: 0,
          certificates: 0,
          valid_certificates: 0,
        },
        students: [
          {
            user_id: "550e8400-e29b-41d4-a716-446655440000",
            email: "aluno@example.com",
            name: "Aluno Exemplo",
            created_at: "2026-08-03T00:00:00-03:00",
            enrollment_count: 0,
            certificate_count: 0,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejeita total negativo e campos extras", () => {
    expect(
      paginatedStudentsAdminDashboardSchema.safeParse({
        ...EMPTY_DASHBOARD,
        totals: { ...EMPTY_DASHBOARD.totals, students: -1 },
      }).success,
    ).toBe(false);
    expect(
      paginatedStudentsAdminDashboardSchema.safeParse({
        ...EMPTY_DASHBOARD,
        pagination: {},
      }).success,
    ).toBe(false);
  });
});
