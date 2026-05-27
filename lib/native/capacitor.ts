"use client";

import { Capacitor } from "@capacitor/core";

export function isNativeShell() {
  return Capacitor.isNativePlatform();
}

export function nativePlatform() {
  return Capacitor.getPlatform();
}

export async function lightHaptic() {
  if (!isNativeShell()) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}
