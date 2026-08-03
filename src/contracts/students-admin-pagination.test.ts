import { describe, expect, it } from "vitest";

import { paginatedStudentsAdminDashboardSchema } from "@/contracts/students-admin-pagination";

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
