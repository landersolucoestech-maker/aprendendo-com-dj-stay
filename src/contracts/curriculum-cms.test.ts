import { describe, expect, it } from "vitest";

import {
  curriculumLessonRowSchema,
  curriculumModuleRowSchema,
  lessonFormSchema,
  lessonFormToPayload,
  lessonMediaRowSchema,
  lessonPrerequisiteRowSchema,
  lessonToFormValues,
  moduleFormSchema,
  moduleFormToPayload,
  modulePrerequisiteRowSchema,
  moduleToFormValues,
  type CurriculumLessonRow,
  type CurriculumModuleRow,
  type LessonFormValues,
  type ModuleFormValues,
} from "./curriculum-cms";

const MODULE_ID = "123e4567-e89b-42d3-a456-426614174000";
const LESSON_ID = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const COURSE_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "9b2c4d6e-8f10-4a12-b345-6789abcdef01";
const OTHER_ID = "8a6b4c2d-1e3f-4a5b-9c7d-0123456789ab";
const ASSET_ID = "62b59f98-5d90-4d7f-8f40-9364c1bd74a1";
const TIMESTAMP = "2026-08-02T10:00:00-03:00";
const LATER_TIMESTAMP = "2026-08-02T12:00:00-03:00";
const LOCAL_START = "2026-08-02T10:00";
const LOCAL_END = "2026-08-02T12:00";

const BASE_MODULE: CurriculumModuleRow = {
  id: MODULE_ID,
  course_id: COURSE_ID,
  titulo: "Fundamentos",
  descricao: "Módulo inicial.",
  ordem: 0,
  status: "draft",
  obrigatorio: true,
  release_mode: "immediate",
  release_at: null,
  drip_delay_days: null,
  preview_enabled: false,
  version: 1,
  duplicated_from_module_id: null,
  created_by_user_id: USER_ID,
  updated_by_user_id: USER_ID,
  archived_at: null,
  deleted_at: null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
};

const BASE_LESSON: CurriculumLessonRow = {
  id: LESSON_ID,
  modulo_id: MODULE_ID,
  titulo: "Primeira aula",
  descricao: "Apresentação do conteúdo.",
  conteudo_texto: null,
  ordem: 0,
  duracao: 600,
  status: "draft",
  content_kind: "video",
  audio_asset_id: null,
  obrigatoria: true,
  completion_mode: "manual",
  completion_percent: null,
  preview_enabled: false,
  release_mode: "immediate",
  release_at: null,
  drip_delay_days: null,
  availability_starts_at: TIMESTAMP,
  availability_ends_at: LATER_TIMESTAMP,
  version: 1,
  duplicated_from_lesson_id: null,
  created_by_user_id: USER_ID,
  updated_by_user_id: USER_ID,
  archived_at: null,
  deleted_at: null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
};

const BASE_MODULE_FORM: ModuleFormValues = {
  title: "Fundamentos",
  description: "Módulo inicial.",
  status: "draft",
  required: true,
  releaseMode: "immediate",
  releaseAt: "",
  dripDelayDays: "",
  previewEnabled: false,
  prerequisiteIds: [],
};

const BASE_LESSON_FORM: LessonFormValues = {
  title: "Primeira aula",
  description: "Apresentação do conteúdo.",
  textContent: "",
  durationSeconds: "600",
  status: "draft",
  contentKind: "video",
  required: true,
  completionMode: "manual",
  completionPercent: "",
  previewEnabled: false,
  releaseMode: "immediate",
  releaseAt: "",
  dripDelayDays: "",
  availabilityStartsAt: LOCAL_START,
  availabilityEndsAt: LOCAL_END,
  prerequisiteIds: [],
};

const expectSameInstant = (
  actual: unknown,
  expected: string | null,
): void => {
  expect(typeof actual).toBe("string");
  expect(expected).not.toBeNull();
  expect(new Date(actual as string).getTime()).toBe(
    new Date(expected ?? "").getTime(),
  );
};

describe("curriculumModuleRowSchema", () => {
  it("aceita os quatro modos persistidos coerentes", () => {
    expect(curriculumModuleRowSchema.parse(BASE_MODULE)).toEqual(BASE_MODULE);
    expect(
      curriculumModuleRowSchema.parse({
        ...BASE_MODULE,
        release_mode: "scheduled",
        release_at: LATER_TIMESTAMP,
      }),
    ).toEqual({
      ...BASE_MODULE,
      release_mode: "scheduled",
      release_at: LATER_TIMESTAMP,
    });
    expect(
      curriculumModuleRowSchema.parse({
        ...BASE_MODULE,
        release_mode: "drip",
        drip_delay_days: 7,
      }),
    ).toEqual({
      ...BASE_MODULE,
      release_mode: "drip",
      drip_delay_days: 7,
    });
    expect(
      curriculumModuleRowSchema.parse({
        ...BASE_MODULE,
        release_mode: "after_prerequisites",
      }),
    ).toEqual({ ...BASE_MODULE, release_mode: "after_prerequisites" });
  });

  it.each([
    { release_mode: "immediate", release_at: TIMESTAMP },
    { release_mode: "scheduled", release_at: null },
    { release_mode: "scheduled", release_at: TIMESTAMP, drip_delay_days: 1 },
    { release_mode: "drip", drip_delay_days: null },
    { release_mode: "after_prerequisites", drip_delay_days: 1 },
  ])("rejeita contrato persistido de liberação inválido %#", (change) => {
    expect(
      curriculumModuleRowSchema.safeParse({ ...BASE_MODULE, ...change }).success,
    ).toBe(false);
  });

  it("exige timestamp no status arquivado e arquivamento na exclusão", () => {
    expect(
      curriculumModuleRowSchema.safeParse({
        ...BASE_MODULE,
        status: "archived",
      }).success,
    ).toBe(false);
    expect(
      curriculumModuleRowSchema.safeParse({
        ...BASE_MODULE,
        deleted_at: TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      curriculumModuleRowSchema.parse({
        ...BASE_MODULE,
        status: "archived",
        archived_at: TIMESTAMP,
        deleted_at: LATER_TIMESTAMP,
      }).status,
    ).toBe("archived");
  });

  it("normaliza descrição e rejeita campos extras", () => {
    expect(
      curriculumModuleRowSchema.parse({
        ...BASE_MODULE,
        descricao: "  Descrição válida  ",
      }).descricao,
    ).toBe("Descrição válida");
    expect(
      curriculumModuleRowSchema.safeParse({
        ...BASE_MODULE,
        internal_payload: {},
      }).success,
    ).toBe(false);
  });
});

describe("curriculumLessonRowSchema", () => {
  it("aceita aula manual e progresso de mídia coerentes", () => {
    expect(curriculumLessonRowSchema.parse(BASE_LESSON)).toEqual(BASE_LESSON);
    const mediaProgress = {
      ...BASE_LESSON,
      completion_mode: "media_progress",
      completion_percent: 80,
    } as const;
    expect(curriculumLessonRowSchema.parse(mediaProgress)).toEqual(mediaProgress);
  });

  it("rejeita percentual fora do modo de mídia ou ausente nele", () => {
    expect(
      curriculumLessonRowSchema.safeParse({
        ...BASE_LESSON,
        completion_percent: 80,
      }).success,
    ).toBe(false);
    expect(
      curriculumLessonRowSchema.safeParse({
        ...BASE_LESSON,
        completion_mode: "media_progress",
      }).success,
    ).toBe(false);
  });

  it("exige conteúdo textual para aulas textuais e mistas", () => {
    expect(
      curriculumLessonRowSchema.safeParse({
        ...BASE_LESSON,
        content_kind: "text",
      }).success,
    ).toBe(false);
    expect(
      curriculumLessonRowSchema.parse({
        ...BASE_LESSON,
        content_kind: "mixed",
        conteudo_texto: "  Conteúdo válido  ",
      }).conteudo_texto,
    ).toBe("Conteúdo válido");
  });

  it("rejeita disponibilidade fora de ordem e duração negativa", () => {
    expect(
      curriculumLessonRowSchema.safeParse({
        ...BASE_LESSON,
        availability_starts_at: LATER_TIMESTAMP,
        availability_ends_at: TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      curriculumLessonRowSchema.safeParse({ ...BASE_LESSON, duracao: -1 })
        .success,
    ).toBe(false);
  });

  it("aplica release e lifecycle também às aulas", () => {
    expect(
      curriculumLessonRowSchema.safeParse({
        ...BASE_LESSON,
        release_mode: "scheduled",
      }).success,
    ).toBe(false);
    expect(
      curriculumLessonRowSchema.safeParse({
        ...BASE_LESSON,
        status: "archived",
      }).success,
    ).toBe(false);
    expect(
      curriculumLessonRowSchema.safeParse({
        ...BASE_LESSON,
        deleted_at: TIMESTAMP,
      }).success,
    ).toBe(false);
  });
});

describe("pré-requisitos persistidos", () => {
  it("aceita dependências distintas", () => {
    expect(
      modulePrerequisiteRowSchema.parse({
        module_id: MODULE_ID,
        prerequisite_module_id: OTHER_ID,
        created_by_user_id: USER_ID,
        created_at: TIMESTAMP,
      }).prerequisite_module_id,
    ).toBe(OTHER_ID);
    expect(
      lessonPrerequisiteRowSchema.parse({
        lesson_id: LESSON_ID,
        prerequisite_lesson_id: OTHER_ID,
        created_by_user_id: USER_ID,
        created_at: TIMESTAMP,
      }).prerequisite_lesson_id,
    ).toBe(OTHER_ID);
  });

  it("rejeita dependência autorreferente", () => {
    expect(
      modulePrerequisiteRowSchema.safeParse({
        module_id: MODULE_ID,
        prerequisite_module_id: MODULE_ID,
        created_by_user_id: USER_ID,
        created_at: TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      lessonPrerequisiteRowSchema.safeParse({
        lesson_id: LESSON_ID,
        prerequisite_lesson_id: LESSON_ID,
        created_by_user_id: USER_ID,
        created_at: TIMESTAMP,
      }).success,
    ).toBe(false);
  });
});

describe("lessonMediaRowSchema", () => {
  const baseMedia = {
    id: OTHER_ID,
    lesson_id: LESSON_ID,
    watermark_enabled: true,
    is_active: true,
    created_by_user_id: USER_ID,
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
  } as const;

  it("aceita mídia privada com asset e mídia externa com identificador", () => {
    expect(
      lessonMediaRowSchema.parse({
        ...baseMedia,
        provider: "private_asset",
        asset_id: ASSET_ID,
        external_video_id: null,
      }).provider,
    ).toBe("private_asset");
    expect(
      lessonMediaRowSchema.parse({
        ...baseMedia,
        provider: "youtube",
        asset_id: null,
        external_video_id: "video-123",
      }).provider,
    ).toBe("youtube");
  });

  it.each([
    { provider: "private_asset", asset_id: null, external_video_id: null },
    {
      provider: "private_asset",
      asset_id: ASSET_ID,
      external_video_id: "video-123",
    },
    { provider: "vimeo", asset_id: ASSET_ID, external_video_id: "video-123" },
    { provider: "youtube", asset_id: null, external_video_id: null },
  ])("rejeita combinação de mídia incoerente %#", (media) => {
    expect(lessonMediaRowSchema.safeParse({ ...baseMedia, ...media }).success).toBe(
      false,
    );
  });
});

describe("moduleFormSchema", () => {
  it("aceita os modos imediato, agendado, gradual e por pré-requisitos", () => {
    expect(moduleFormSchema.parse(BASE_MODULE_FORM)).toEqual(BASE_MODULE_FORM);
    expect(
      moduleFormSchema.parse({
        ...BASE_MODULE_FORM,
        releaseMode: "scheduled",
        releaseAt: LOCAL_START,
      }).releaseMode,
    ).toBe("scheduled");
    expect(
      moduleFormSchema.parse({
        ...BASE_MODULE_FORM,
        releaseMode: "drip",
        dripDelayDays: "7",
      }).releaseMode,
    ).toBe("drip");
    expect(
      moduleFormSchema.parse({
        ...BASE_MODULE_FORM,
        releaseMode: "after_prerequisites",
        prerequisiteIds: [OTHER_ID],
      }).releaseMode,
    ).toBe("after_prerequisites");
  });

  it("rejeita data local inválida e campos extras", () => {
    expect(
      moduleFormSchema.safeParse({
        ...BASE_MODULE_FORM,
        releaseMode: "scheduled",
        releaseAt: "2026-8-2T10:00",
      }).success,
    ).toBe(false);
    expect(
      moduleFormSchema.safeParse({ ...BASE_MODULE_FORM, debug: true }).success,
    ).toBe(false);
  });

  it("rejeita pré-requisitos duplicados, autorreferentes ou ausentes", () => {
    expect(
      moduleFormSchema.safeParse({
        ...BASE_MODULE_FORM,
        prerequisiteIds: [OTHER_ID, OTHER_ID],
      }).success,
    ).toBe(false);
    expect(
      moduleFormSchema.safeParse({
        ...BASE_MODULE_FORM,
        entityId: MODULE_ID,
        prerequisiteIds: [MODULE_ID],
      }).success,
    ).toBe(false);
    expect(
      moduleFormSchema.safeParse({
        ...BASE_MODULE_FORM,
        releaseMode: "after_prerequisites",
      }).success,
    ).toBe(false);
  });
});

describe("lessonFormSchema", () => {
  it("aceita aula válida e coage campos somente no payload", () => {
    expect(lessonFormSchema.parse(BASE_LESSON_FORM)).toEqual(BASE_LESSON_FORM);
  });

  it("rejeita duração negativa ou fora do inteiro seguro", () => {
    expect(
      lessonFormSchema.safeParse({
        ...BASE_LESSON_FORM,
        durationSeconds: "-1",
      }).success,
    ).toBe(false);
    expect(
      lessonFormSchema.safeParse({
        ...BASE_LESSON_FORM,
        durationSeconds: "999999999999999999999",
      }).success,
    ).toBe(false);
  });

  it("rejeita conclusão, texto e disponibilidade inválidos", () => {
    expect(
      lessonFormSchema.safeParse({
        ...BASE_LESSON_FORM,
        completionMode: "media_progress",
        completionPercent: "",
      }).success,
    ).toBe(false);
    expect(
      lessonFormSchema.safeParse({
        ...BASE_LESSON_FORM,
        contentKind: "text",
        textContent: "   ",
      }).success,
    ).toBe(false);
    expect(
      lessonFormSchema.safeParse({
        ...BASE_LESSON_FORM,
        availabilityStartsAt: LOCAL_END,
        availabilityEndsAt: LOCAL_START,
      }).success,
    ).toBe(false);
  });

  it("rejeita pré-requisito duplicado e autorreferente", () => {
    expect(
      lessonFormSchema.safeParse({
        ...BASE_LESSON_FORM,
        prerequisiteIds: [OTHER_ID, OTHER_ID],
      }).success,
    ).toBe(false);
    expect(
      lessonFormSchema.safeParse({
        ...BASE_LESSON_FORM,
        entityId: LESSON_ID,
        prerequisiteIds: [LESSON_ID],
      }).success,
    ).toBe(false);
  });
});

describe("conversões do currículo", () => {
  it("revalida módulo e aula antes de preencher formulários", () => {
    expect(() =>
      moduleToFormValues(
        { ...BASE_MODULE, release_mode: "scheduled", release_at: null },
        [],
      ),
    ).toThrow();
    expect(() =>
      lessonToFormValues(
        { ...BASE_LESSON, completion_mode: "media_progress" },
        [],
      ),
    ).toThrow();
  });

  it("impede autorreferência ao converter registros existentes", () => {
    expect(() => moduleToFormValues(BASE_MODULE, [MODULE_ID])).toThrow();
    expect(() => lessonToFormValues(BASE_LESSON, [LESSON_ID])).toThrow();
  });

  it("remove campos ocultos incompatíveis no payload do módulo", () => {
    const immediate = moduleFormToPayload({
      ...BASE_MODULE_FORM,
      releaseAt: LOCAL_START,
      dripDelayDays: "7",
    }) as Record<string, unknown>;
    expect(immediate.release_at).toBeNull();
    expect(immediate.drip_delay_days).toBeNull();

    const scheduled = moduleFormToPayload({
      ...BASE_MODULE_FORM,
      releaseMode: "scheduled",
      releaseAt: LOCAL_START,
      dripDelayDays: "7",
    }) as Record<string, unknown>;
    expectSameInstant(scheduled.release_at, new Date(LOCAL_START).toISOString());
    expect(scheduled.drip_delay_days).toBeNull();

    const drip = moduleFormToPayload({
      ...BASE_MODULE_FORM,
      releaseMode: "drip",
      releaseAt: LOCAL_START,
      dripDelayDays: "7",
    }) as Record<string, unknown>;
    expect(drip.release_at).toBeNull();
    expect(drip.drip_delay_days).toBe(7);
  });

  it("remove percentual e release ocultos no payload da aula", () => {
    const payload = lessonFormToPayload({
      ...BASE_LESSON_FORM,
      completionPercent: "80",
      releaseAt: LOCAL_START,
      dripDelayDays: "7",
    }) as Record<string, unknown>;

    expect(payload.completion_percent).toBeNull();
    expect(payload.release_at).toBeNull();
    expect(payload.drip_delay_days).toBeNull();
  });

  it("preserva instantes no roundtrip de módulo e aula", () => {
    const scheduledModule: CurriculumModuleRow = {
      ...BASE_MODULE,
      release_mode: "scheduled",
      release_at: TIMESTAMP,
    };
    const modulePayload = moduleFormToPayload(
      moduleToFormValues(scheduledModule, []),
    ) as Record<string, unknown>;
    expectSameInstant(modulePayload.release_at, scheduledModule.release_at);

    const scheduledLesson: CurriculumLessonRow = {
      ...BASE_LESSON,
      release_mode: "scheduled",
      release_at: TIMESTAMP,
    };
    const lessonPayload = lessonFormToPayload(
      lessonToFormValues(scheduledLesson, []),
    ) as Record<string, unknown>;
    expectSameInstant(lessonPayload.release_at, scheduledLesson.release_at);
    expectSameInstant(
      lessonPayload.availability_starts_at,
      scheduledLesson.availability_starts_at,
    );
    expectSameInstant(
      lessonPayload.availability_ends_at,
      scheduledLesson.availability_ends_at,
    );
  });

  it("revalida formulários antes de produzir payload", () => {
    expect(() =>
      moduleFormToPayload({
        ...BASE_MODULE_FORM,
        releaseMode: "after_prerequisites",
      }),
    ).toThrow();
    expect(() =>
      lessonFormToPayload({
        ...BASE_LESSON_FORM,
        contentKind: "mixed",
        textContent: "",
      }),
    ).toThrow();
  });
});
