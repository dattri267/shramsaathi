import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import pa from "./locales/pa.json";
import bn from "./locales/bn.json";
import mr from "./locales/mr.json";
import kn from "./locales/kn.json";
import ta from "./locales/ta.json";
import te from "./locales/te.json";
import ml from "./locales/ml.json";

const LANGUAGE_KEY = "@shramsaathi_language";

export type SupportedLanguage =
  | "en"
  | "hi"
  | "pa"
  | "bn"
  | "mr"
  | "kn"
  | "ta"
  | "te"
  | "ml";

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  pa: { translation: pa },
  bn: { translation: bn },
  mr: { translation: mr },
  kn: { translation: kn },
  ta: { translation: ta },
  te: { translation: te },
  ml: { translation: ml },
};

const getDeviceLanguage = (): SupportedLanguage => {
  const locale = Localization.getLocales()[0]?.languageCode;

  const supportedLanguages: SupportedLanguage[] = [
    "en",
    "hi",
    "pa",
    "bn",
    "mr",
    "kn",
    "ta",
    "te",
    "ml",
  ];

  return supportedLanguages.includes(locale as SupportedLanguage)
    ? (locale as SupportedLanguage)
    : "en";
};

export const initializeI18n = async () => {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  const language: SupportedLanguage =
    savedLanguage && (Object.keys(resources) as SupportedLanguage[]).includes(
      savedLanguage as SupportedLanguage
    )
      ? (savedLanguage as SupportedLanguage)
      : getDeviceLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: "en",
      interpolation: { escapeValue: false },
    });

  return i18n;
};

export const changeLanguage = async (language: SupportedLanguage) => {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
};

export default i18n;
