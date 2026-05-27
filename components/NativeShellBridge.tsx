"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { isNativeShell, lightHaptic, nativePlatform } from "@/lib/native/capacitor";

const rootRoutes = new Set(["/", "/dashboard", "/portfolio", "/market", "/settings"]);

export function NativeShellBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isNativeShell()) return;

    document.documentElement.dataset.nativeShell = nativePlatform();

    let cleanupBackButton = () => undefined;
    let cancelled = false;

    void (async () => {
      const [{ App }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/splash-screen"),
        import("@capacitor/status-bar"),
      ]);

      if (cancelled) return;

      await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
      await StatusBar.setBackgroundColor({ color: "#03140f" }).catch(() => undefined);
      await SplashScreen.hide().catch(() => undefined);

      const backButtonHandle = await App.addListener("backButton", async () => {
        if (closeOpenNativeSheet()) return;

        const currentPathname = pathnameRef.current;
        if (!rootRoutes.has(currentPathname) && window.history.length > 1) {
          router.back();
          return;
        }

        const shouldExit = window.confirm("Keluar dari ArahDana?");
        if (shouldExit) {
          await App.exitApp();
        }
      });

      cleanupBackButton = () => {
        void backButtonHandle.remove();
      };
    })();

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest("button,a,[data-native-haptic]");
      if (action) void lightHaptic();
    }

    window.addEventListener("click", handleClick, { capture: true });

    return () => {
      cancelled = true;
      cleanupBackButton();
      window.removeEventListener("click", handleClick, { capture: true });
    };
  }, [router]);

  return null;
}

function closeOpenNativeSheet() {
  let didClose = false;
  window.dispatchEvent(
    new CustomEvent("arahdana:native-back", {
      detail: {
        closeSheet: () => {
          didClose = true;
        },
      },
    }),
  );
  return didClose;
}
