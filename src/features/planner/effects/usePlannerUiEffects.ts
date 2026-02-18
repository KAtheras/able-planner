import { useEffect, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from "react";
import type { NavKey } from "@/components/layout/Sidebar";
import type { ReportView } from "@/components/reports/ReportsHeader";
import type { SupportedLanguage } from "@/copy";
import type { WtaMode, WtaStatus } from "@/features/planner/inputs/wtaFlow";

type UsePlannerUiEffectsParams = {
  active: NavKey;
  inputStep: 1 | 2;
  reportView: ReportView;
  language: SupportedLanguage;
  showWelcome: boolean;
  showWelcomeTermsOfUse: boolean;
  residencyBlocking: boolean;
  showSsiIncomeEligibilityWarning: boolean;
  showFscQuestionnaire: boolean;
  annualReturnWarningText: string | null;
  budgetMode: "default" | "qualifiedWithdrawals";
  wtaDismissed: boolean;
  wtaMode: WtaMode;
  wtaStatus: WtaStatus;
  messagesMode: "intro" | "fsc";
  shellRef: RefObject<HTMLDivElement | null>;
  consoleCardRef: RefObject<HTMLDivElement | null>;
  fscQuestionnaireRef: RefObject<HTMLDivElement | null>;
  welcomeTermsCardRef: RefObject<HTMLElement | null>;
  lastMobileConsoleModeRef: MutableRefObject<"annual" | "residency" | "fsc" | "ssi" | null>;
  lastMobileScreen2PanelRef: MutableRefObject<string | null>;
  setSidebarDesktopTopOffset: Dispatch<SetStateAction<number>>;
  scrollMobileElementWithOffset: (
    element: HTMLElement | null,
    behavior?: ScrollBehavior,
  ) => void;
};

export function usePlannerUiEffects({
  active,
  inputStep,
  reportView,
  language,
  showWelcome,
  showWelcomeTermsOfUse,
  residencyBlocking,
  showSsiIncomeEligibilityWarning,
  showFscQuestionnaire,
  annualReturnWarningText,
  budgetMode,
  wtaDismissed,
  wtaMode,
  wtaStatus,
  messagesMode,
  shellRef,
  consoleCardRef,
  fscQuestionnaireRef,
  welcomeTermsCardRef,
  lastMobileConsoleModeRef,
  lastMobileScreen2PanelRef,
  setSidebarDesktopTopOffset,
  scrollMobileElementWithOffset,
}: UsePlannerUiEffectsParams) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile || showWelcome || active !== "inputs" || inputStep !== 1) {
      lastMobileConsoleModeRef.current = null;
      return;
    }

    const mode: "annual" | "residency" | "fsc" | "ssi" | null = residencyBlocking
      ? "residency"
      : showSsiIncomeEligibilityWarning
        ? "ssi"
        : showFscQuestionnaire
          ? "fsc"
          : annualReturnWarningText
            ? "annual"
            : null;

    if (!mode || lastMobileConsoleModeRef.current === mode) {
      if (!mode) {
        lastMobileConsoleModeRef.current = null;
      }
      return;
    }

    lastMobileConsoleModeRef.current = mode;
    scrollMobileElementWithOffset(consoleCardRef.current, "smooth");

    if (mode === "annual") {
      window.setTimeout(() => {
        const annualReturnInput = document.getElementById("demographics-annual-return") as HTMLInputElement | null;
        annualReturnInput?.focus({ preventScroll: true });
        annualReturnInput?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [
    active,
    annualReturnWarningText,
    inputStep,
    residencyBlocking,
    scrollMobileElementWithOffset,
    showSsiIncomeEligibilityWarning,
    showFscQuestionnaire,
    showWelcome,
    consoleCardRef,
    lastMobileConsoleModeRef,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile || showWelcome || active !== "inputs" || inputStep !== 1 || !showFscQuestionnaire) {
      return;
    }
    window.setTimeout(() => {
      fscQuestionnaireRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [active, inputStep, showFscQuestionnaire, showWelcome, fscQuestionnaireRef]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile || showWelcome || active !== "inputs" || inputStep !== 2) {
      lastMobileScreen2PanelRef.current = null;
      return;
    }

    if (budgetMode === "qualifiedWithdrawals") {
      const panelKey = "qualifiedWithdrawals";
      if (lastMobileScreen2PanelRef.current === panelKey) {
        return;
      }
      lastMobileScreen2PanelRef.current = panelKey;
      window.setTimeout(() => {
        scrollMobileElementWithOffset(consoleCardRef.current, "smooth");
      }, 0);
      return;
    }

    const shouldFocusWtaPanel =
      !wtaDismissed &&
      (wtaMode === "initialPrompt" ||
        wtaMode === "wtaQuestion" ||
        wtaMode === "noPath" ||
        wtaMode === "combinedLimit");
    const panelKey = shouldFocusWtaPanel ? `${wtaMode}:${wtaStatus}` : null;
    if (!panelKey) {
      lastMobileScreen2PanelRef.current = null;
      return;
    }
    if (lastMobileScreen2PanelRef.current === panelKey) {
      return;
    }
    lastMobileScreen2PanelRef.current = panelKey;

    window.setTimeout(() => {
      scrollMobileElementWithOffset(consoleCardRef.current, "smooth");
    }, 0);
  }, [
    active,
    budgetMode,
    inputStep,
    scrollMobileElementWithOffset,
    showWelcome,
    wtaDismissed,
    wtaMode,
    wtaStatus,
    consoleCardRef,
    lastMobileScreen2PanelRef,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const measureSidebarOffset = () => {
      if (window.innerWidth < 768) return;
      const shellTop = shellRef.current?.getBoundingClientRect().top;
      const cardTop = consoleCardRef.current?.getBoundingClientRect().top;
      if (!Number.isFinite(shellTop) || !Number.isFinite(cardTop)) return;
      const next = Math.max(0, Math.round((cardTop as number) - (shellTop as number)));
      setSidebarDesktopTopOffset((prev) => (prev === next ? prev : next));
    };

    const rafId = window.requestAnimationFrame(measureSidebarOffset);
    window.addEventListener("resize", measureSidebarOffset);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => measureSidebarOffset());
      if (shellRef.current) observer.observe(shellRef.current);
      if (consoleCardRef.current) observer.observe(consoleCardRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measureSidebarOffset);
      observer?.disconnect();
    };
  }, [
    active,
    inputStep,
    reportView,
    showWelcome,
    language,
    messagesMode,
    annualReturnWarningText,
    residencyBlocking,
    showFscQuestionnaire,
    consoleCardRef,
    shellRef,
    setSidebarDesktopTopOffset,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !showWelcome || !showWelcomeTermsOfUse) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    const rafId = window.requestAnimationFrame(() => {
      const card = welcomeTermsCardRef.current;
      if (!card) return;
      const topNav = document.querySelector("header");
      const topNavHeight = topNav instanceof HTMLElement ? topNav.getBoundingClientRect().height : 0;
      const targetTop = card.getBoundingClientRect().top + window.scrollY - topNavHeight - 8;
      window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [showWelcome, showWelcomeTermsOfUse, welcomeTermsCardRef]);
}
