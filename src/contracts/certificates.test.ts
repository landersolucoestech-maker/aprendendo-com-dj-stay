import { describe, expect, it } from "vitest";

import {
  adminCertificateSchema,
  adminCourseSchema,
  adminEnrollmentSchema,
  adminStudentSchema,
  certificateStatusSchema,
  certificateSummarySchema,
  certificateValidationSchema,
  enrollmentCompletionSchema,
  enrollmentSourceSchema,
  enrollmentStatusSchema,
  myCertificatesSchema,
  studentsAdminDashboardSchema,
} from "./certificates";

const CERTIFICATE_ID = "123e4567-e89b-42d3-a456-426614174000";
const ENROLLMENT_ID = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const COURSE_ID = "9b2c4d6e-8f10-4a12-b345-6789abcdef01";
const TIMESTAMP = "2026-08-02T07:00:00-03:00";
const CERTIFICATE_CODE = "DJSTAY-0123456789ABCDEF0123";

const ISSUED_CERTIFICATE = {
  id: CERTIFICATE_ID,
  code: CERTIFICATE_CODE,
  status: "issued",
  student_name: "Aluno Exemplo",
  course_title: "Aprendendo com DJ Stay",
  completion_percent: 80,
  issued_at: TIMESTAMP,
  revoked_at: null,
  revocation_reason: null,
} as const;

const REVOKED_CERTIFICATE = {
  ...ISSUED_CERTIFICATE,
  status: "revoked",
  revoked_at: TIMESTAMP,
  revocation_reason: "Revogação administrativa justificada.",
} as const;

const COMPLETION = {
  enrollment_id: ENROLLMENT_ID,
  user_id: USER_ID,
  course_id: COURSE_ID,
  enrollment_status: "active",
  course_title: "Aprendendo com DJ Stay",
  certificate_enabled: true,
  completion_mode: "percentage",
  minimum_percent: 75,
  total_lessons: 10,
  completed_lessons: 8,
  completion_percent: 80,
  eligible: true,
} as const;

const ADMIN_STUDENT = {
  user_id: USER_ID,
  email: "aluno@example.com",
  name: "Aluno Exemplo",
  created_at: TIMESTAMP,
  enrollment_count: 1,
  certificate_count: 1,
} as const;

const ADMIN_COURSE = {
  id: COURSE_ID,
  title: "Aprendendo com DJ Stay",
  status: "published",
  certificate_enabled: true,
  certificate_min_completion_percent: 75,
} as const;

const ADMIN_ENROLLMENT = {
  id: ENROLLMENT_ID,
  user_id: USER_ID,
  course_id: COURSE_ID,
  course_title: "Aprendendo com DJ Stay",
  status: "active",
  source: "purchase",
  starts_at: TIMESTAMP,
  expires_at: null,
  status_reason: null,
  completion: COMPLETION,
  active_certificate_id: CERTIFICATE_ID,
  active_certificate_code: CERTIFICATE_CODE,
} as const;

const ADMIN_CERTIFICATE = {
  ...ISSUED_CERTIFICATE,
  enrollment_id: ENROLLMENT_ID,
  user_id: USER_ID,
  course_id: COURSE_ID,
} as const;

describe("enums de certificados e matrículas", () => {
  it.each(["issued", "revoked"] as const)(
    "aceita status de certificado %s",
    (status) => {
      expect(certificateStatusSchema.parse(status)).toBe(status);
    },
  );

  it.each(["pending", "active", "suspended", "revoked"] as const)(
    "aceita status de matrícula %s",
    (status) => {
      expect(enrollmentStatusSchema.parse(status)).toBe(status);
    },
  );

  it.each(["manual_grant", "purchase"] as const)(
    "aceita origem de matrícula %s",
    (source) => {
      expect(enrollmentSourceSchema.parse(source)).toBe(source);
    },
  );

  it.each(["valid", "ISSUED", ""])("rejeita status inválido %j", (status) => {
    expect(certificateStatusSchema.safeParse(status).success).toBe(false);
  });
});

describe("certificateSummarySchema", () => {
  it("aceita certificado emitido sem dados de revogação", () => {
    expect(certificateSummarySchema.parse(ISSUED_CERTIFICATE)).toEqual(
      ISSUED_CERTIFICATE,
    );
  });

  it("aceita certificado revogado com horário e motivo", () => {
    expect(certificateSummarySchema.parse(REVOKED_CERTIFICATE)).toEqual(
      REVOKED_CERTIFICATE,
    );
  });

  it("normaliza nome, título e motivo", () => {
    const result = certificateSummarySchema.parse({
      ...REVOKED_CERTIFICATE,
      student_name: "  Aluno Exemplo  ",
      course_title: "  Curso Exemplo  ",
      revocation_reason: "  Motivo auditável  ",
    });

    expect(result.student_name).toBe("Aluno Exemplo");
    expect(result.course_title).toBe("Curso Exemplo");
    expect(result.revocation_reason).toBe("Motivo auditável");
  });

  it("rejeita certificado emitido com dados de revogação", () => {
    expect(
      certificateSummarySchema.safeParse({
        ...ISSUED_CERTIFICATE,
        revoked_at: TIMESTAMP,
        revocation_reason: "Motivo indevido",
      }).success,
    ).toBe(false);
  });

  it("rejeita certificado revogado sem horário ou motivo", () => {
    expect(
      certificateSummarySchema.safeParse({
        ...REVOKED_CERTIFICATE,
        revoked_at: null,
      }).success,
    ).toBe(false);
    expect(
      certificateSummarySchema.safeParse({
        ...REVOKED_CERTIFICATE,
        revocation_reason: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita motivo de revogação fora do limite", () => {
    expect(
      certificateSummarySchema.safeParse({
        ...REVOKED_CERTIFICATE,
        revocation_reason: "ab",
      }).success,
    ).toBe(false);
    expect(
      certificateSummarySchema.safeParse({
        ...REVOKED_CERTIFICATE,
        revocation_reason: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });

  it("rejeita código, snapshots, percentual e timestamp inválidos", () => {
    expect(
      certificateSummarySchema.safeParse({
        ...ISSUED_CERTIFICATE,
        code: "DJSTAY-invalido",
      }).success,
    ).toBe(false);
    expect(
      certificateSummarySchema.safeParse({
        ...ISSUED_CERTIFICATE,
        student_name: "A",
      }).success,
    ).toBe(false);
    expect(
      certificateSummarySchema.safeParse({
        ...ISSUED_CERTIFICATE,
        course_title: "a".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      certificateSummarySchema.safeParse({
        ...ISSUED_CERTIFICATE,
        completion_percent: 101,
      }).success,
    ).toBe(false);
    expect(
      certificateSummarySchema.safeParse({
        ...ISSUED_CERTIFICATE,
        issued_at: "2026-08-02T07:00:00",
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      certificateSummarySchema.safeParse({
        ...ISSUED_CERTIFICATE,
        issued_by_user_id: USER_ID,
      }).success,
    ).toBe(false);
  });

  it("aceita coleção de certificados e rejeita item divergente", () => {
    expect(myCertificatesSchema.parse([ISSUED_CERTIFICATE])).toEqual([
      ISSUED_CERTIFICATE,
    ]);
    expect(
      myCertificatesSchema.safeParse([
        { ...ISSUED_CERTIFICATE, status: "invalid" },
      ]).success,
    ).toBe(false);
  });
});

describe("certificateValidationSchema", () => {
  it("aceita resultado não encontrado estrito", () => {
    expect(
      certificateValidationSchema.parse({ found: false, valid: false }),
    ).toEqual({ found: false, valid: false });
  });

  it("rejeita resultado não encontrado com dados adicionais", () => {
    expect(
      certificateValidationSchema.safeParse({
        found: false,
        valid: false,
        code: CERTIFICATE_CODE,
      }).success,
    ).toBe(false);
  });

  it("aceita certificado público válido e revogado inválido", () => {
    expect(
      certificateValidationSchema.parse({
        ...ISSUED_CERTIFICATE,
        found: true,
        valid: true,
      }),
    ).toEqual({ ...ISSUED_CERTIFICATE, found: true, valid: true });

    expect(
      certificateValidationSchema.parse({
        ...REVOKED_CERTIFICATE,
        found: true,
        valid: false,
      }),
    ).toEqual({ ...REVOKED_CERTIFICATE, found: true, valid: false });
  });

  it("rejeita validade divergente do status", () => {
    expect(
      certificateValidationSchema.safeParse({
        ...ISSUED_CERTIFICATE,
        found: true,
        valid: false,
      }).success,
    ).toBe(false);
    expect(
      certificateValidationSchema.safeParse({
        ...REVOKED_CERTIFICATE,
        found: true,
        valid: true,
      }).success,
    ).toBe(false);
  });
});

describe("enrollmentCompletionSchema", () => {
  it("aceita percentual e elegibilidade calculados", () => {
    expect(enrollmentCompletionSchema.parse(COMPLETION)).toEqual(COMPLETION);
  });

  it("aceita modo manual ativo mesmo sem aulas", () => {
    const value = {
      ...COMPLETION,
      completion_mode: "manual",
      total_lessons: 0,
      completed_lessons: 0,
      completion_percent: 0,
      eligible: true,
    } as const;

    expect(enrollmentCompletionSchema.parse(value)).toEqual(value);
  });

  it("rejeita aulas concluídas acima do total", () => {
    expect(
      enrollmentCompletionSchema.safeParse({
        ...COMPLETION,
        completed_lessons: 11,
        completion_percent: 100,
      }).success,
    ).toBe(false);
  });

  it("rejeita percentual divergente das contagens", () => {
    expect(
      enrollmentCompletionSchema.safeParse({
        ...COMPLETION,
        completion_percent: 79,
      }).success,
    ).toBe(false);
  });

  it("rejeita elegibilidade divergente do status ou percentual", () => {
    expect(
      enrollmentCompletionSchema.safeParse({
        ...COMPLETION,
        eligible: false,
      }).success,
    ).toBe(false);
    expect(
      enrollmentCompletionSchema.safeParse({
        ...COMPLETION,
        enrollment_status: "suspended",
        eligible: true,
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      enrollmentCompletionSchema.safeParse({
        ...COMPLETION,
        debug: true,
      }).success,
    ).toBe(false);
  });
});

describe("modelos administrativos", () => {
  it("aceita aluno com e-mail e e-mail nulo", () => {
    expect(adminStudentSchema.parse(ADMIN_STUDENT)).toEqual(ADMIN_STUDENT);
    expect(
      adminStudentSchema.parse({ ...ADMIN_STUDENT, email: null }).email,
    ).toBeNull();
  });

  it("rejeita contagem negativa e campo extra no aluno", () => {
    expect(
      adminStudentSchema.safeParse({
        ...ADMIN_STUDENT,
        enrollment_count: -1,
      }).success,
    ).toBe(false);
    expect(
      adminStudentSchema.safeParse({
        ...ADMIN_STUDENT,
        metadata: {},
      }).success,
    ).toBe(false);
  });

  it("aceita curso administrativo e rejeita percentual inválido", () => {
    expect(adminCourseSchema.parse(ADMIN_COURSE)).toEqual(ADMIN_COURSE);
    expect(
      adminCourseSchema.safeParse({
        ...ADMIN_COURSE,
        certificate_min_completion_percent: 0,
      }).success,
    ).toBe(false);
  });

  it("aceita matrícula administrativa coerente", () => {
    expect(adminEnrollmentSchema.parse(ADMIN_ENROLLMENT)).toEqual(
      ADMIN_ENROLLMENT,
    );
  });

  it("aceita matrícula sem certificado ativo", () => {
    const value = {
      ...ADMIN_ENROLLMENT,
      active_certificate_id: null,
      active_certificate_code: null,
    } as const;

    expect(adminEnrollmentSchema.parse(value)).toEqual(value);
  });

  it("rejeita par incompleto de certificado ativo", () => {
    expect(
      adminEnrollmentSchema.safeParse({
        ...ADMIN_ENROLLMENT,
        active_certificate_code: null,
      }).success,
    ).toBe(false);
    expect(
      adminEnrollmentSchema.safeParse({
        ...ADMIN_ENROLLMENT,
        active_certificate_id: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita conclusão pertencente a outra matrícula", () => {
    expect(
      adminEnrollmentSchema.safeParse({
        ...ADMIN_ENROLLMENT,
        completion: {
          ...COMPLETION,
          enrollment_id: CERTIFICATE_ID,
        },
      }).success,
    ).toBe(false);
  });

  it("aceita certificado administrativo e rejeita campo extra", () => {
    expect(adminCertificateSchema.parse(ADMIN_CERTIFICATE)).toEqual(
      ADMIN_CERTIFICATE,
    );
    expect(
      adminCertificateSchema.safeParse({
        ...ADMIN_CERTIFICATE,
        metadata: {},
      }).success,
    ).toBe(false);
  });
});

describe("studentsAdminDashboardSchema", () => {
  const dashboard = {
    students: [ADMIN_STUDENT],
    courses: [ADMIN_COURSE],
    enrollments: [ADMIN_ENROLLMENT],
    certificates: [ADMIN_CERTIFICATE],
  } as const;

  it("aceita dashboard completo", () => {
    expect(studentsAdminDashboardSchema.parse(dashboard)).toEqual(dashboard);
  });

  it("rejeita campos extras na raiz e em objetos aninhados", () => {
    expect(
      studentsAdminDashboardSchema.safeParse({
        ...dashboard,
        total: 1,
      }).success,
    ).toBe(false);
    expect(
      studentsAdminDashboardSchema.safeParse({
        ...dashboard,
        courses: [{ ...ADMIN_COURSE, deleted_at: null }],
      }).success,
    ).toBe(false);
  });
});
