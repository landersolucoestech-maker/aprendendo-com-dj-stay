import { describe, expect, it } from "vitest";

import {
  digitalProductAccessSchema,
  digitalProductAccessesSchema,
  digitalProductDeliverableRowSchema,
  digitalProductEventSchema,
  digitalProductEventsSchema,
  digitalProductLicenseSchema,
  digitalProductLicensesSchema,
  digitalProductSchema,
  digitalProductsSchema,
  marketplaceAttachDeliverableInputSchema,
  marketplaceCreateLicenseInputSchema,
  marketplaceCreateProductInputSchema,
  marketplaceLicenseLifecycleInputSchema,
  marketplaceProductLifecycleInputSchema,
  marketplaceUpdateProductInputSchema,
} from "@/contracts/marketplace";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const LICENSE_ID = "22222222-2222-4222-8222-222222222222";
const ACCESS_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";
const ASSET_ID = "55555555-5555-4555-8555-555555555555";
const DELIVERABLE_ID = "66666666-6666-4666-8666-666666666666";
const EVENT_ID = "77777777-7777-4777-8777-777777777777";
const ACTOR_ID = "88888888-8888-4888-8888-888888888888";
const TIMESTAMP = "2026-08-02T08:00:00.000Z";
const LATER_TIMESTAMP = "2026-08-03T08:00:00.000Z";

const DRAFT_PRODUCT = {
  id: PRODUCT_ID,
  title: "Pacote de samples",
  slug: "pacote-de-samples",
  short_description: "Samples selecionados para produção musical.",
  description: "Biblioteca completa de samples em alta qualidade.",
  category: "Samples",
  status: "draft",
  cover_asset_id: null,
  thumbnail_asset_id: null,
  price_amount: 100,
  currency_code: "BRL",
  promotional_price_amount: 80,
  promotion_starts_at: TIMESTAMP,
  promotion_ends_at: LATER_TIMESTAMP,
  availability_starts_at: TIMESTAMP,
  availability_ends_at: LATER_TIMESTAMP,
  affiliate_eligible: true,
  version: 1,
  created_by_user_id: ACTOR_ID,
  updated_by_user_id: ACTOR_ID,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  published_at: null,
  unpublished_at: null,
  archived_at: null,
  deleted_at: null,
} as const;

const PUBLISHED_PRODUCT = {
  ...DRAFT_PRODUCT,
  status: "published",
  published_at: TIMESTAMP,
} as const;

const ARCHIVED_PRODUCT = {
  ...DRAFT_PRODUCT,
  status: "archived",
  archived_at: LATER_TIMESTAMP,
} as const;

const DRAFT_LICENSE = {
  id: LICENSE_ID,
  product_id: PRODUCT_ID,
  kind: "commercial",
  title: "Licença comercial",
  summary: "Uso comercial permitido conforme os termos.",
  terms_text: "Termos completos da licença comercial do produto digital.",
  version: 1,
  status: "draft",
  is_default: false,
  created_by_user_id: ACTOR_ID,
  created_at: TIMESTAMP,
  published_at: null,
  archived_at: null,
} as const;

const ACTIVE_ACCESS = {
  id: ACCESS_ID,
  product_id: PRODUCT_ID,
  user_id: USER_ID,
  license_id: LICENSE_ID,
  status: "active",
  source: "purchase",
  source_reference: "order-2026-0001",
  license_snapshot: {
    kind: "commercial",
    title: "Licença comercial",
    version: 1,
  },
  granted_by_user_id: null,
  granted_at: TIMESTAMP,
  expires_at: LATER_TIMESTAMP,
  revoked_at: null,
  revocation_reason: null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
} as const;

const DELIVERABLE = {
  id: DELIVERABLE_ID,
  product_id: PRODUCT_ID,
  asset_id: ASSET_ID,
  title: "Arquivo principal",
  description: "Download em formato ZIP.",
  position: 0,
  required: true,
  created_by_user_id: ACTOR_ID,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  deleted_at: null,
} as const;

describe("digitalProductSchema", () => {
  it("aceita produtos draft, published e archived coerentes", () => {
    expect(digitalProductSchema.parse(DRAFT_PRODUCT)).toEqual(DRAFT_PRODUCT);
    expect(digitalProductSchema.parse(PUBLISHED_PRODUCT)).toEqual(PUBLISHED_PRODUCT);
    expect(digitalProductSchema.parse(ARCHIVED_PRODUCT)).toEqual(ARCHIVED_PRODUCT);
    expect(digitalProductsSchema.parse([DRAFT_PRODUCT])).toEqual([DRAFT_PRODUCT]);
  });

  it("aceita produto despublicado com histórico de publicação", () => {
    const unpublished = {
      ...DRAFT_PRODUCT,
      published_at: TIMESTAMP,
      unpublished_at: LATER_TIMESTAMP,
    } as const;
    expect(digitalProductSchema.parse(unpublished)).toEqual(unpublished);
  });

  it("rejeita slug fora do formato ou dos limites", () => {
    for (const slug of ["ab", "Pacote-Samples", "pacote--samples", `${"a".repeat(161)}`]) {
      expect(
        digitalProductSchema.safeParse({ ...DRAFT_PRODUCT, slug }).success,
      ).toBe(false);
    }
  });

  it("rejeita textos opcionais vazios ou acima dos limites persistidos", () => {
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        short_description: "",
      }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        description: "x".repeat(20_001),
      }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        category: "x".repeat(121),
      }).success,
    ).toBe(false);
  });

  it("rejeita preço promocional igual ou superior ao preço principal", () => {
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        promotional_price_amount: 100,
      }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        promotional_price_amount: 101,
      }).success,
    ).toBe(false);
  });

  it("aceita preço zero sem promoção e rejeita promoção em produto gratuito", () => {
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        price_amount: 0,
        promotional_price_amount: null,
      }).success,
    ).toBe(true);
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        price_amount: 0,
        promotional_price_amount: 0,
      }).success,
    ).toBe(false);
  });

  it("rejeita janelas invertidas ou com instantes iguais", () => {
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        promotion_starts_at: LATER_TIMESTAMP,
        promotion_ends_at: TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        availability_starts_at: TIMESTAMP,
        availability_ends_at: TIMESTAMP,
      }).success,
    ).toBe(false);
  });

  it("aceita janelas parcialmente definidas conforme o constraint SQL", () => {
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        promotion_ends_at: null,
        availability_starts_at: null,
      }).success,
    ).toBe(true);
  });

  it("rejeita lifecycle impossível e exclusão fora de archived", () => {
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        status: "published",
      }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        archived_at: TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({
        ...DRAFT_PRODUCT,
        deleted_at: TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({
        ...ARCHIVED_PRODUCT,
        deleted_at: LATER_TIMESTAMP,
      }).success,
    ).toBe(true);
  });

  it("rejeita moeda, versão, timestamp, UUID e campos extras inválidos", () => {
    expect(
      digitalProductSchema.safeParse({ ...DRAFT_PRODUCT, currency_code: "brl" }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({ ...DRAFT_PRODUCT, version: 0 }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({ ...DRAFT_PRODUCT, created_at: "2026-08-02" }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({ ...DRAFT_PRODUCT, id: "produto" }).success,
    ).toBe(false);
    expect(
      digitalProductSchema.safeParse({ ...DRAFT_PRODUCT, internal: true }).success,
    ).toBe(false);
  });
});

describe("digitalProductLicenseSchema", () => {
  it("aceita licenças draft, published e archived coerentes", () => {
    expect(digitalProductLicenseSchema.parse(DRAFT_LICENSE)).toEqual(DRAFT_LICENSE);

    const published = {
      ...DRAFT_LICENSE,
      status: "published",
      published_at: TIMESTAMP,
    } as const;
    expect(digitalProductLicenseSchema.parse(published)).toEqual(published);

    const archived = {
      ...published,
      status: "archived",
      archived_at: LATER_TIMESTAMP,
    } as const;
    expect(digitalProductLicenseSchema.parse(archived)).toEqual(archived);
    expect(digitalProductLicensesSchema.parse([published])).toEqual([published]);
  });

  it("rejeita lifecycle e limites textuais inválidos", () => {
    expect(
      digitalProductLicenseSchema.safeParse({
        ...DRAFT_LICENSE,
        status: "published",
      }).success,
    ).toBe(false);
    expect(
      digitalProductLicenseSchema.safeParse({
        ...DRAFT_LICENSE,
        summary: "",
      }).success,
    ).toBe(false);
    expect(
      digitalProductLicenseSchema.safeParse({
        ...DRAFT_LICENSE,
        terms_text: "curto",
      }).success,
    ).toBe(false);
  });

  it("rejeita versão não positiva e campos extras", () => {
    expect(
      digitalProductLicenseSchema.safeParse({ ...DRAFT_LICENSE, version: 0 }).success,
    ).toBe(false);
    expect(
      digitalProductLicenseSchema.safeParse({ ...DRAFT_LICENSE, hidden: true }).success,
    ).toBe(false);
  });
});

describe("digitalProductDeliverableRowSchema", () => {
  it("aceita entregável persistido", () => {
    expect(digitalProductDeliverableRowSchema.parse(DELIVERABLE)).toEqual(DELIVERABLE);
  });

  it("rejeita posição negativa, descrição vazia ou longa e campos extras", () => {
    expect(
      digitalProductDeliverableRowSchema.safeParse({
        ...DELIVERABLE,
        position: -1,
      }).success,
    ).toBe(false);
    expect(
      digitalProductDeliverableRowSchema.safeParse({
        ...DELIVERABLE,
        description: "",
      }).success,
    ).toBe(false);
    expect(
      digitalProductDeliverableRowSchema.safeParse({
        ...DELIVERABLE,
        description: "x".repeat(2_001),
      }).success,
    ).toBe(false);
    expect(
      digitalProductDeliverableRowSchema.safeParse({
        ...DELIVERABLE,
        secret: true,
      }).success,
    ).toBe(false);
  });
});

describe("digitalProductAccessSchema", () => {
  it("aceita acesso ativo e revogado coerentes", () => {
    expect(digitalProductAccessSchema.parse(ACTIVE_ACCESS)).toEqual(ACTIVE_ACCESS);
    expect(digitalProductAccessesSchema.parse([ACTIVE_ACCESS])).toEqual([ACTIVE_ACCESS]);

    const revoked = {
      ...ACTIVE_ACCESS,
      status: "revoked",
      revoked_at: LATER_TIMESTAMP,
      revocation_reason: "Reembolso confirmado para o pedido.",
    } as const;
    expect(digitalProductAccessSchema.parse(revoked)).toEqual(revoked);
  });

  it("rejeita o estado suspended inexistente no PostgreSQL", () => {
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        status: "suspended",
      }).success,
    ).toBe(false);
  });

  it("rejeita campos suspended inexistentes na tabela", () => {
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        suspended_at: TIMESTAMP,
        suspension_reason: "Teste",
      }).success,
    ).toBe(false);
  });

  it("rejeita expiração anterior ou igual à concessão", () => {
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        expires_at: TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        expires_at: "2026-08-01T08:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("rejeita combinações de revogação impossíveis", () => {
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        revoked_at: LATER_TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        status: "revoked",
        revoked_at: LATER_TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        status: "revoked",
        revocation_reason: "Motivo sem timestamp.",
      }).success,
    ).toBe(false);
  });

  it("rejeita referência e motivo fora dos limites", () => {
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        source_reference: "",
      }).success,
    ).toBe(false);
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        source_reference: "x".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        status: "revoked",
        revoked_at: LATER_TIMESTAMP,
        revocation_reason: "x",
      }).success,
    ).toBe(false);
  });

  it("rejeita snapshot não objeto e campos extras", () => {
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        license_snapshot: "commercial",
      }).success,
    ).toBe(false);
    expect(
      digitalProductAccessSchema.safeParse({
        ...ACTIVE_ACCESS,
        hidden: true,
      }).success,
    ).toBe(false);
  });
});

describe("digitalProductEventSchema", () => {
  const event = {
    id: EVENT_ID,
    product_id: PRODUCT_ID,
    deliverable_id: DELIVERABLE_ID,
    license_id: LICENSE_ID,
    access_id: ACCESS_ID,
    actor_user_id: ACTOR_ID,
    event_type: "access_granted",
    version: 2,
    details: { source: "purchase" },
    created_at: TIMESTAMP,
  } as const;

  it("aceita evento canônico e coleção de eventos", () => {
    expect(digitalProductEventSchema.parse(event)).toEqual(event);
    expect(digitalProductEventsSchema.parse([event])).toEqual([event]);
  });

  it("rejeita tipo livre, versão não positiva, details não objeto e campos extras", () => {
    expect(
      digitalProductEventSchema.safeParse({ ...event, event_type: "custom" }).success,
    ).toBe(false);
    expect(
      digitalProductEventSchema.safeParse({ ...event, version: 0 }).success,
    ).toBe(false);
    expect(
      digitalProductEventSchema.safeParse({ ...event, details: [] }).success,
    ).toBe(false);
    expect(
      digitalProductEventSchema.safeParse({ ...event, internal: true }).success,
    ).toBe(false);
  });
});

describe("marketplace input schemas", () => {
  const productValues = {
    title: "  Pacote de samples  ",
    slug: "  PACOTE-DE-SAMPLES  ",
    shortDescription: "  Resumo  ",
    description: "  Descrição completa  ",
    category: "  Samples  ",
    priceAmount: 100,
    currencyCode: " brl ",
    affiliateEligible: true,
  } as const;

  it("normaliza criação de produto", () => {
    expect(marketplaceCreateProductInputSchema.parse(productValues)).toEqual({
      title: "Pacote de samples",
      slug: "pacote-de-samples",
      shortDescription: "Resumo",
      description: "Descrição completa",
      category: "Samples",
      priceAmount: 100,
      currencyCode: "BRL",
      affiliateEligible: true,
    });
  });

  it("valida atualização e lifecycle com UUID e versão", () => {
    expect(
      marketplaceUpdateProductInputSchema.safeParse({
        productId: PRODUCT_ID,
        expectedVersion: 1,
        values: productValues,
      }).success,
    ).toBe(true);
    expect(
      marketplaceProductLifecycleInputSchema.safeParse({
        productId: PRODUCT_ID,
        expectedVersion: 0,
      }).success,
    ).toBe(false);
    expect(
      marketplaceLicenseLifecycleInputSchema.safeParse({
        licenseId: "licenca",
      }).success,
    ).toBe(false);
  });

  it("valida licença e entregável conforme os limites persistidos", () => {
    expect(
      marketplaceCreateLicenseInputSchema.safeParse({
        productId: PRODUCT_ID,
        kind: "commercial",
        title: "Licença comercial",
        summary: "Resumo da licença",
        termsText: "Termos completos e válidos para uso comercial.",
        isDefault: true,
      }).success,
    ).toBe(true);
    expect(
      marketplaceAttachDeliverableInputSchema.safeParse({
        productId: PRODUCT_ID,
        assetId: ASSET_ID,
        title: "Arquivo principal",
        description: "x".repeat(2_001),
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras em todos os inputs", () => {
    expect(
      marketplaceCreateProductInputSchema.safeParse({
        ...productValues,
        hidden: true,
      }).success,
    ).toBe(false);
    expect(
      marketplaceLicenseLifecycleInputSchema.safeParse({
        licenseId: LICENSE_ID,
        hidden: true,
      }).success,
    ).toBe(false);
  });
});
