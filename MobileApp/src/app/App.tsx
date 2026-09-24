import React, { useEffect, useState } from "react";
import AppNavigator from "./navigation/AppNavigator";
import { initializeI18n } from "../i18n";


export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initializeI18n()
      .then(() => {
        setI18nReady(true);
      })
      .catch((error: unknown) => {
        console.error("Failed to initialize i18n:", error);
        setI18nReady(true);
      });
  }, []);

  if (!i18nReady) {
    return null;
  }

  return <AppNavigator />;
}