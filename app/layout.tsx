import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { BrandProvider } from "@/lib/brand-context";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "SENTRIX — Digital Risk Protection Platform | CIPHER",
  description: "AI-Powered Universal Digital Risk Protection Platform. Detect Threats. Defend Trust. Developed by Team CIPHER for HacXLerate 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-sentrix-bg text-sentrix-text antialiased">
        <AuthProvider>
          <BrandProvider>
            <AppShell>{children}</AppShell>
          </BrandProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

