import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import hi from "./locales/hi.json";

const LANGUAGE_KEY = "@shramsaathi_language";

const resources = {
  en: {
    translation: en,
  },
  hi: {
    translation: hi,
  },
};

const getDeviceLanguage = (): "en" | "hi" => {
  const locale = Localization.getLocales()[0]?.languageCode;

  return locale === "hi" ? "hi" : "en";
};

export const initializeI18n = async () => {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  const language =
    savedLanguage === "hi" || savedLanguage === "en"
      ? savedLanguage
      : getDeviceLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
    });

  return i18n;
};

export const changeLanguage = async (
  language: "en" | "hi"
) => {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
};

export default i18n;