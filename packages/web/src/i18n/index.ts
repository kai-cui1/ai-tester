import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import zhCN from "./locales/zh-CN";

const STORAGE_KEY = "ai-tester:lang";

const savedLang = localStorage.getItem(STORAGE_KEY) || "zh-CN";

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export function changeLanguage(lang: "zh-CN" | "en") {
  i18n.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang === "zh-CN" ? "zh" : "en";
}

// Set initial html lang attribute
document.documentElement.lang = savedLang === "zh-CN" ? "zh" : "en";

export default i18n;
