type LandingContent = Partial<{
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

export function resolvePlannerLandingCopy({
  landingOverride,
  landingWelcomeOverride,
  fallbackLanding,
}: {
  landingOverride: LandingContent | undefined;
  landingWelcomeOverride: string;
  fallbackLanding: LandingContent | undefined;
}) {
  const hasLandingOverride = Boolean(
    landingOverride &&
      (landingOverride.heroTitle?.trim() ||
        landingOverride.heroBody?.trim() ||
        landingOverride.disclosuresTitle?.trim() ||
        landingOverride.disclosuresIntro?.trim() ||
        landingOverride.disclosuresBody?.trim() ||
        landingOverride.agreeToTermsPrefix?.trim() ||
        landingOverride.agreeAndContinueLabel?.trim() ||
        landingOverride.termsOfUseLinkLabel?.trim() ||
        landingOverride.termsOfUseTitle?.trim() ||
        landingOverride.termsOfUseBody?.trim() ||
        (Array.isArray(landingOverride.heroBullets) && landingOverride.heroBullets.length > 0)),
  );

  const useLegacyLandingWelcomeOverride = Boolean(landingWelcomeOverride) && !hasLandingOverride;

  const landingCopy = {
    heroTitle: landingOverride?.heroTitle?.trim() || fallbackLanding?.heroTitle || "",
    heroBody:
      landingOverride?.heroBody?.trim() ||
      (useLegacyLandingWelcomeOverride ? landingWelcomeOverride : "") ||
      fallbackLanding?.heroBody ||
      "",
    heroBullets:
      Array.isArray(landingOverride?.heroBullets) && landingOverride.heroBullets.length > 0
        ? landingOverride.heroBullets
        : (fallbackLanding?.heroBullets ?? []),
    disclosuresTitle: landingOverride?.disclosuresTitle?.trim() || fallbackLanding?.disclosuresTitle || "",
    disclosuresIntro: landingOverride?.disclosuresIntro?.trim() || fallbackLanding?.disclosuresIntro || "",
    disclosuresBody: landingOverride?.disclosuresBody?.trim() || fallbackLanding?.disclosuresBody || "",
    agreeToTermsPrefix: landingOverride?.agreeToTermsPrefix?.trim() || fallbackLanding?.agreeToTermsPrefix || "",
    agreeAndContinueLabel:
      landingOverride?.agreeAndContinueLabel?.trim() || fallbackLanding?.agreeAndContinueLabel || "",
    termsOfUseLinkLabel:
      landingOverride?.termsOfUseLinkLabel?.trim() || fallbackLanding?.termsOfUseLinkLabel || "",
    termsOfUseTitle: landingOverride?.termsOfUseTitle?.trim() || fallbackLanding?.termsOfUseTitle || "",
    termsOfUseBody: landingOverride?.termsOfUseBody?.trim() || fallbackLanding?.termsOfUseBody || "",
  };

  return {
    useLegacyLandingWelcomeOverride,
    landingCopy,
    termsOfUseParagraphs: (landingCopy.termsOfUseBody || "").split("\n\n").filter(Boolean),
  };
}
