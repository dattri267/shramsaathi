import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { changeLanguage } from "../i18n";

export default function LanguageButton() {
  const { i18n, t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const currentLanguage = i18n.language === "hi" ? "hi" : "en";

  const selectLanguage = async (language: "en" | "hi") => {
    await changeLanguage(language);
    setVisible(false);
  };

  return (
    <>
      <Pressable
        style={styles.languageButton}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.globe}>🌐</Text>

        <Text style={styles.languageText}>
          {currentLanguage === "hi" ? "हिन्दी" : "EN"}
        </Text>

        <Text style={styles.arrow}>⌄</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={styles.dropdown}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.dropdownTitle}>
              {t("language.selectLanguage")}
            </Text>

            <Pressable
              style={styles.languageOption}
              onPress={() => selectLanguage("en")}
            >
              <Text style={styles.optionText}>
                {t("language.english")}
              </Text>

              {currentLanguage === "en" && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.languageOption}
              onPress={() => selectLanguage("hi")}
            >
              <Text style={styles.optionText}>
                {t("language.hindi")}
              </Text>

              {currentLanguage === "hi" && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  languageButton: {
    position: "absolute",
    top: 90,
    right: 16,

    height: 38,
    paddingHorizontal: 11,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 20,

    elevation: 3,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,

    zIndex: 100,
  },

  globe: {
    fontSize: 16,
    marginRight: 5,
  },

  languageText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222222",
  },

  arrow: {
    fontSize: 17,
    marginLeft: 4,
    marginTop: -3,
    color: "#666666",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  dropdown: {
    position: "absolute",
    top: 58,
    right: 16,

    width: 175,

    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,

    elevation: 8,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  dropdownTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888888",

    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  languageOption: {
    minHeight: 42,

    paddingHorizontal: 14,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionText: {
    fontSize: 14,
    color: "#222222",
  },

  checkmark: {
    fontSize: 18,
    fontWeight: "700",
    color: "#7047E8",
  },
});