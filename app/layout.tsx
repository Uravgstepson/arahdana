import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";
import { PwaRegistration } from "@/components/PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "ArahDana",
  title: "ArahDana",
  description: "Dasbor pendukung keputusan investasi Indonesia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ArahDana",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#047857",
    "msapplication-tap-highlight": "no",
  },
  icons: {
    icon: [
      { url: "/icons/arahdana-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/arahdana-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/arahdana-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#edf3f7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <PwaRegistration />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
