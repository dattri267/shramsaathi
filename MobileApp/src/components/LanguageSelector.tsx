import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../i18n";

export default function LanguageSelector() {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const handleLanguageChange = async (language: "en" | "hi") => {
    if (language === currentLanguage) {
      return;
    }

    await changeLanguage(language);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t("language.selectLanguage")}
      </Text>

      <View style={styles.options}>
        <Pressable
          style={[
            styles.option,
            currentLanguage === "en" && styles.selectedOption,
          ]}
          onPress={() => handleLanguageChange("en")}
        >
          <Text
            style={[
              styles.optionText,
              currentLanguage === "en" && styles.selectedOptionText,
            ]}
          >
            {t("language.english")}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.option,
            currentLanguage === "hi" && styles.selectedOption,
          ]}
          onPress={() => handleLanguageChange("hi")}
        >
          <Text
            style={[
              styles.optionText,
              currentLanguage === "hi" && styles.selectedOptionText,
            ]}
          >
            {t("language.hindi")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 12,
  },

  options: {
    flexDirection: "row",
    gap: 10,
  },

  option: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  selectedOption: {
    backgroundColor: "#7047E8",
    borderColor: "#7047E8",
  },

  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555555",
  },

  selectedOptionText: {
    color: "#FFFFFF",
  },
});