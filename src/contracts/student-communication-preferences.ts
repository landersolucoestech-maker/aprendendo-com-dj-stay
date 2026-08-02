import { z } from "zod";

const consentVersionSchema = z.string().trim().min(1).max(100).nullable();
const preferenceTimestampSchema = z.string().datetime({ offset: true });

const requiresOptionalConsent = (value: {
  readonly email_marketing: boolean;
  readonly privacy_analytics: boolean;
}): boolean => value.email_marketing || value.privacy_analytics;

export const studentCommunicationPreferencesSchema = z
  .object({
    in_app_transactional: z.literal(true),
    email_transactional: z.boolean(),
    email_product_updates: z.boolean(),
    email_marketing: z.boolean(),
    privacy_analytics: z.boolean(),
    consent_version: consentVersionSchema,
    consented_at: preferenceTimestampSchema.nullable(),
    updated_at: preferenceTimestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const consentRequired = requiresOptionalConsent(value);
    const hasConsentVersion = value.consent_version !== null;
    const hasConsentedAt = value.consented_at !== null;

    if (hasConsentVersion !== hasConsentedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasConsentVersion ? ["consented_at"] : ["consent_version"],
        message: "Versão e horário do consentimento devem existir em conjunto.",
      });
    }

    if (consentRequired && (!hasConsentVersion || !hasConsentedAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consent_version"],
        message: "Marketing ou analytics exigem consentimento versionado.",
      });
    }

    if (!consentRequired && (hasConsentVersion || hasConsentedAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consent_version"],
        message:
          "Consentimento opcional deve permanecer ausente quando marketing e analytics estão desativados.",
      });
    }
  });

export const updateStudentCommunicationPreferencesSchema = z
  .object({
    email_transactional: z.boolean(),
    email_product_updates: z.boolean(),
    email_marketing: z.boolean(),
    privacy_analytics: z.boolean(),
    consent_version: consentVersionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const consentRequired = requiresOptionalConsent(value);

    if (consentRequired && !value.consent_version) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consent_version"],
        message: "A versão do consentimento é obrigatória.",
      });
    }

    if (!consentRequired && value.consent_version !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consent_version"],
        message:
          "A versão do consentimento deve ser nula quando marketing e analytics estão desativados.",
      });
    }
  });

export type StudentCommunicationPreferences = z.infer<
  typeof studentCommunicationPreferencesSchema
>;
export type UpdateStudentCommunicationPreferences = z.infer<
  typeof updateStudentCommunicationPreferencesSchema
>;
