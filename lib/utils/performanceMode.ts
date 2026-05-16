import { useEffect, useState } from "react";

export type PerformanceMode = "low" | "balanced" | "high";

export type PerformanceProfile = {
  mode: PerformanceMode;
  reduceMotion: boolean;
  reduceChartAnimation: boolean;
  reduceBlurEffects: boolean;
  simplifyTooltips: boolean;
};

type NavigatorSignals = Navigator & {
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
  };
  deviceMemory?: number;
};

const defaultProfile: PerformanceProfile = {
  mode: "balanced",
  reduceMotion: false,
  reduceChartAnimation: true,
  reduceBlurEffects: false,
  simplifyTooltips: false,
};

export function getPerformanceMode(): PerformanceProfile {
  if (typeof window === "undefined") return defaultProfile;

  const navigatorSignals = window.navigator as NavigatorSignals;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const smallScreen = window.matchMedia("(max-width: 767px)").matches;
  const saveData = Boolean(navigatorSignals.connection?.saveData);
  const effectiveType = navigatorSignals.connection?.effectiveType ?? "";
  const deviceMemory = navigatorSignals.deviceMemory;
  const hardwareConcurrency = navigatorSignals.hardwareConcurrency;
  const touchDevice =
    coarsePointer ||
    navigatorSignals.maxTouchPoints > 0 ||
    "ontouchstart" in window;

  const lowMemory = typeof deviceMemory === "number" && deviceMemory <= 2;
  const modestMemory = typeof deviceMemory === "number" && deviceMemory <= 4;
  const lowCore = hardwareConcurrency <= 2;
  const modestCore = hardwareConcurrency <= 4;
  const slowConnection = effectiveType === "slow-2g" || effectiveType === "2g";

  let mode: PerformanceMode = "high";
  if (reduceMotion || saveData || lowMemory || lowCore || slowConnection) {
    mode = "low";
  } else if (smallScreen || touchDevice || modestMemory || modestCore) {
    mode = "balanced";
  }

  return {
    mode,
    reduceMotion,
    reduceChartAnimation: mode !== "high" || reduceMotion,
    reduceBlurEffects: mode === "low" || saveData,
    simplifyTooltips: mode === "low" || touchDevice,
  };
}

export function usePerformanceMode() {
  const [profile, setProfile] = useState<PerformanceProfile>(defaultProfile);

  useEffect(() => {
    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const smallScreenQuery = window.matchMedia("(max-width: 767px)");

    const updateProfile = () => setProfile(getPerformanceMode());

    updateProfile();
    reduceMotionQuery.addEventListener("change", updateProfile);
    coarsePointerQuery.addEventListener("change", updateProfile);
    smallScreenQuery.addEventListener("change", updateProfile);
    window.addEventListener("orientationchange", updateProfile);

    return () => {
      reduceMotionQuery.removeEventListener("change", updateProfile);
      coarsePointerQuery.removeEventListener("change", updateProfile);
      smallScreenQuery.removeEventListener("change", updateProfile);
      window.removeEventListener("orientationchange", updateProfile);
    };
  }, []);

  return profile;
}
