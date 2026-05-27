import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || "https://arahdana.id";

const config: CapacitorConfig = {
  appId: "id.arahdana.app",
  appName: "ArahDana",
  webDir: "capacitor-www",
  backgroundColor: "#03140f",
  loggingBehavior: "debug",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#03140f",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#03140f",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#03140f",
      overlaysWebView: false,
    },
  },
};

export default config;
