import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";
import { NativeShellBridge } from "@/components/NativeShellBridge";
import { PwaRegistration } from "@/components/PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "ArahDana",
  title: "ArahDana",
  description: "Home pendukung keputusan investasi Indonesia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ArahDana",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#00C878",
    "msapplication-tap-highlight": "no",
  },
  icons: {
    icon: [
      { url: "/icons/Logo%20App.svg", type: "image/svg+xml" },
      { url: "/icons/Logo%20App.png", sizes: "2000x2000", type: "image/png" },
    ],
    apple: [{ url: "/icons/Logo%20App.png", sizes: "2000x2000", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#00C878",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <PwaRegistration />
        <NativeShellBridge />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
