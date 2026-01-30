import en from "./en.json";
import es from "./es.json";

export type SupportedLanguage = "en" | "es";

export type Copy = typeof en;

export function getCopy(lang: SupportedLanguage): Copy {
  if (lang === "es") return es as Copy;
  return en as Copy;
}