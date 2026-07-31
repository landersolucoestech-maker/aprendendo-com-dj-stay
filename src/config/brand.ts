export type BrandDecisionStatus = "blocked" | "approved";
export type VisualIdentityStatus = "provisional" | "approved";

export interface BrandDecision {
  readonly status: BrandDecisionStatus;
  readonly operationalName: string;
  readonly officialName: string | null;
  readonly descriptor: string | null;
  readonly slogan: string | null;
  readonly domain: string | null;
  readonly emailSender: string | null;
  readonly legalOwner: string;
  readonly socialProfiles: {
    readonly instagram: string | null;
    readonly tiktok: string | null;
    readonly youtube: string | null;
  };
  readonly visualIdentity: {
    readonly status: VisualIdentityStatus;
    readonly logoPath: string;
    readonly logoAlt: string;
    readonly paletteStatus: VisualIdentityStatus;
  };
  readonly unresolvedCandidates: readonly string[];
}

export const brandDecision = {
  status: "blocked",
  operationalName: "Aprendendo com DJ Stay",
  officialName: null,
  descriptor: null,
  slogan: null,
  domain: null,
  emailSender: null,
  legalOwner: "LANDER SOLUTIONS",
  socialProfiles: {
    instagram: null,
    tiktok: null,
    youtube: null,
  },
  visualIdentity: {
    status: "provisional",
    logoPath: "/lovable-uploads/db1b3703-f32b-43e4-bc00-ee4e8e08c366.png",
    logoAlt: "Identidade visual provisória de Aprendendo com DJ Stay",
    paletteStatus: "provisional",
  },
  unresolvedCandidates: [
    "Aprendendo com DJ Stay",
    "Dica de Cria — com DJ Stay",
  ],
} satisfies BrandDecision;

export const brandConfig = {
  name: brandDecision.officialName ?? brandDecision.operationalName,
  shortName: "DJ Stay",
  logoPath: brandDecision.visualIdentity.logoPath,
  logoAlt: brandDecision.visualIdentity.logoAlt,
  legalOwner: brandDecision.legalOwner,
  decisionStatus: brandDecision.status,
  visualIdentityStatus: brandDecision.visualIdentity.status,
} as const;
