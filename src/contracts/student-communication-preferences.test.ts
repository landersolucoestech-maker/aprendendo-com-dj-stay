import { describe, expect, it } from "vitest";

import {
  studentCommunicationPreferencesSchema,
  updateStudentCommunicationPreferencesSchema,
} from "./student-communication-preferences";

const TIMESTAMP = "2026-08-02T06:45:00-03:00";
const CONSENT_VERSION = "privacy-2026-08-01";

const BASE_PREFERENCES = {
  in_app_transactional: true,
  email_transactional: false,
  email_product_updates: false,
  email_marketing: false,
  privacy_analytics: false,
  consent_version: null,
  consented_at: null,
  updated_at: TIMESTAMP,
} as const;

const BASE_UPDATE = {
  email_transactional: false,
  email_product_updates: false,
  email_marketing: false,
  privacy_analytics: false,
  consent_version: null,
} as const;

describe("studentCommunicationPreferencesSchema", () => {
  it("aceita preferências conservadoras sem consentimento opcional", () => {
    expect(studentCommunicationPreferencesSchema.parse(BASE_PREFERENCES)).toEqual(
      BASE_PREFERENCES,
    );
  });

  it("aceita marketing com versão e horário do consentimento", () => {
    const value = {
      ...BASE_PREFERENCES,
      email_marketing: true,
      consent_version: CONSENT_VERSION,
      consented_at: TIMESTAMP,
    } as const;

    expect(studentCommunicationPreferencesSchema.parse(value)).toEqual(value);
  });

  it("aceita analytics com versão e horário do consentimento", () => {
    const value = {
      ...BASE_PREFERENCES,
      privacy_analytics: true,
      consent_version: CONSENT_VERSION,
      consented_at: TIMESTAMP,
    } as const;

    expect(studentCommunicationPreferencesSchema.parse(value)).toEqual(value);
  });

  it("aceita marketing e analytics compartilhando o mesmo consentimento", () => {
    const value = {
      ...BASE_PREFERENCES,
      email_marketing: true,
      privacy_analytics: true,
      consent_version: CONSENT_VERSION,
      consented_at: TIMESTAMP,
    } as const;

    expect(studentCommunicationPreferencesSchema.parse(value)).toEqual(value);
  });

  it("normaliza espaços externos da versão", () => {
    const result = studentCommunicationPreferencesSchema.parse({
      ...BASE_PREFERENCES,
      email_marketing: true,
      consent_version: `  ${CONSENT_VERSION}  `,
      consented_at: TIMESTAMP,
    });

    expect(result.consent_version).toBe(CONSENT_VERSION);
  });

  it("exige notificações internas transacionais ativas", () => {
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        in_app_transactional: false,
      }).success,
    ).toBe(false);
  });

  it("rejeita versão sem horário de consentimento", () => {
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        email_marketing: true,
        consent_version: CONSENT_VERSION,
      }).success,
    ).toBe(false);
  });

  it("rejeita horário sem versão de consentimento", () => {
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        email_marketing: true,
        consented_at: TIMESTAMP,
      }).success,
    ).toBe(false);
  });

  it("rejeita marketing sem consentimento", () => {
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        email_marketing: true,
      }).success,
    ).toBe(false);
  });

  it("rejeita analytics sem consentimento", () => {
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        privacy_analytics: true,
      }).success,
    ).toBe(false);
  });

  it("rejeita consentimento residual sem marketing ou analytics", () => {
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        consent_version: CONSENT_VERSION,
        consented_at: TIMESTAMP,
      }).success,
    ).toBe(false);
  });

  it("rejeita versão vazia ou acima de 100 caracteres", () => {
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        email_marketing: true,
        consent_version: "   ",
        consented_at: TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        email_marketing: true,
        consent_version: "a".repeat(101),
        consented_at: TIMESTAMP,
      }).success,
    ).toBe(false);
  });

  it("rejeita timestamps sem timezone", () => {
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        updated_at: "2026-08-02T06:45:00",
      }).success,
    ).toBe(false);
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        email_marketing: true,
        consent_version: CONSENT_VERSION,
        consented_at: "2026-08-02T06:45:00",
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      studentCommunicationPreferencesSchema.safeParse({
        ...BASE_PREFERENCES,
        user_id: "123e4567-e89b-42d3-a456-426614174000",
      }).success,
    ).toBe(false);
  });
});

describe("updateStudentCommunicationPreferencesSchema", () => {
  it("aceita atualização conservadora sem consentimento", () => {
    expect(updateStudentCommunicationPreferencesSchema.parse(BASE_UPDATE)).toEqual(
      BASE_UPDATE,
    );
  });

  it("não exige consentimento para e-mail transacional ou atualização de produto", () => {
    const value = {
      ...BASE_UPDATE,
      email_transactional: true,
      email_product_updates: true,
    } as const;

    expect(updateStudentCommunicationPreferencesSchema.parse(value)).toEqual(value);
  });

  it.each([
    { email_marketing: true, privacy_analytics: false },
    { email_marketing: false, privacy_analytics: true },
    { email_marketing: true, privacy_analytics: true },
  ])("aceita opção consentida %#", (optionalFlags) => {
    const value = {
      ...BASE_UPDATE,
      ...optionalFlags,
      consent_version: CONSENT_VERSION,
    };

    expect(updateStudentCommunicationPreferencesSchema.parse(value)).toEqual(value);
  });

  it.each([
    { email_marketing: true, privacy_analytics: false },
    { email_marketing: false, privacy_analytics: true },
    { email_marketing: true, privacy_analytics: true },
  ])("rejeita opção sem versão de consentimento %#", (optionalFlags) => {
    expect(
      updateStudentCommunicationPreferencesSchema.safeParse({
        ...BASE_UPDATE,
        ...optionalFlags,
      }).success,
    ).toBe(false);
  });

  it("rejeita versão residual quando opções consentidas estão desativadas", () => {
    expect(
      updateStudentCommunicationPreferencesSchema.safeParse({
        ...BASE_UPDATE,
        consent_version: CONSENT_VERSION,
      }).success,
    ).toBe(false);
  });

  it("normaliza a versão e rejeita limites inválidos", () => {
    const result = updateStudentCommunicationPreferencesSchema.parse({
      ...BASE_UPDATE,
      email_marketing: true,
      consent_version: `  ${CONSENT_VERSION}  `,
    });
    expect(result.consent_version).toBe(CONSENT_VERSION);

    expect(
      updateStudentCommunicationPreferencesSchema.safeParse({
        ...BASE_UPDATE,
        email_marketing: true,
        consent_version: " ",
      }).success,
    ).toBe(false);
    expect(
      updateStudentCommunicationPreferencesSchema.safeParse({
        ...BASE_UPDATE,
        email_marketing: true,
        consent_version: "a".repeat(101),
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      updateStudentCommunicationPreferencesSchema.safeParse({
        ...BASE_UPDATE,
        in_app_transactional: true,
      }).success,
    ).toBe(false);
  });
});
