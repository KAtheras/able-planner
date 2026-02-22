import type { SupportedLanguage } from "@/copy";
import { getEnabledReportViews } from "@/features/planner/report/reportViewModel";

type ClientBlocks = Partial<
  Record<
    "landingWelcome" | "disclosuresAssumptions" | "rightCardPrimary" | "rightCardSecondary",
    Partial<Record<SupportedLanguage, string>>
  >
>;

type ClientLandingContent = Partial<{
  heroTitle: string;
  heroBody: string;
  heroBullets: string[];
  disclosuresTitle: string;
  disclosuresIntro: string;
  disclosuresBody: string;
  agreeToTermsPrefix: string;
  agreeAndContinueLabel: string;
  termsOfUseLinkLabel: string;
  termsOfUseTitle: string;
  termsOfUseBody: string;
}>;

type ClientLandingOverrides = Partial<Record<SupportedLanguage, ClientLandingContent>>;

type PlannerClientConfig = Partial<{
  enrollmentPageUrl: string;
  planStateCode: string;
  clientBlocks: ClientBlocks;
  landing: ClientLandingOverrides;
  features: {
    reports?: {
      tabs?: string[];
    };
  };
}>;

export function resolvePlannerClientViewConfig(
  currentClientConfig: PlannerClientConfig | undefined,
  language: SupportedLanguage,
) {
  const enrollmentPageUrlRaw = currentClientConfig?.enrollmentPageUrl;
  const enrollmentPageUrl =
    typeof enrollmentPageUrlRaw === "string" && enrollmentPageUrlRaw.trim()
      ? enrollmentPageUrlRaw.trim()
      : "";

  const configuredReportTabs = currentClientConfig?.features?.reports?.tabs ?? [];
  const enabledReportViews = getEnabledReportViews(configuredReportTabs);
  const defaultReportView = enabledReportViews[0] ?? "account_growth";

  const resolveBlock = (
    slot: "landingWelcome" | "disclosuresAssumptions" | "rightCardPrimary" | "rightCardSecondary",
  ) => {
    const raw = currentClientConfig?.clientBlocks?.[slot]?.[language];
    return typeof raw === "string" && raw.trim() ? raw : "";
  };

  return {
    enrollmentPageUrl,
    enabledReportViews,
    defaultReportView,
    landingOverride: currentClientConfig?.landing?.[language],
    blocks: {
      landingWelcome: resolveBlock("landingWelcome"),
      disclosuresAssumptions: resolveBlock("disclosuresAssumptions"),
      rightCardPrimary: resolveBlock("rightCardPrimary"),
      rightCardSecondary: resolveBlock("rightCardSecondary"),
    },
  };
}
