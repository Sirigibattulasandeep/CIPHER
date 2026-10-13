import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { BrandProvider } from "@/lib/brand-context";
import { PrivacyProvider } from "@/lib/privacy-context";
import { NetworkProvider } from "@/lib/network-context";
import { AppShell } from "@/components/layout/app-shell";

export const viewport: Viewport = {
  themeColor: "#0B1118",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SENTRIX — Digital Risk Protection Platform | CIPHER",
  description: "AI-Powered Universal Digital Risk Protection Platform. Detect Threats. Defend Trust. Developed by Team CIPHER for HacXLerate 2026.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sentrix",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  applicationName: "SENTRIX",
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#0B1118",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0B1118" />
      </head>
      <body className="bg-sentrix-bg text-sentrix-text antialiased selection:bg-[#D7A93A]/30 selection:text-[#F1C95D]">
        <NetworkProvider>
          <PrivacyProvider>
            <AuthProvider>
              <BrandProvider>
                <AppShell>{children}</AppShell>
              </BrandProvider>
            </AuthProvider>
          </PrivacyProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}
