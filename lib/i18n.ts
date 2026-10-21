/**
 * Multilingual hook. Every user-facing string can later be routed through t(). For the prototype
 * only English ships; Hindi and Telugu are the planned first additions (see FEATURE_MAP.md, section 15).
 */
export const LOCALES = [
  { id: "en", label: "English", ready: true },
  { id: "hi", label: "हिन्दी (Hindi)", ready: false },
  { id: "te", label: "తెలుగు (Telugu)", ready: false },
] as const;

type Dict = Record<string, string>;
const en: Dict = {
  "nav.home": "Home",
  "nav.circles": "Circles",
  "nav.loans": "Lend / Borrow",
  "nav.ledger": "Ledger",
  "nav.profile": "Profile",
};
const dictionaries: Record<string, Dict> = { en };

export function t(key: string, locale = "en"): string {
  return dictionaries[locale]?.[key] ?? en[key] ?? key;
}
