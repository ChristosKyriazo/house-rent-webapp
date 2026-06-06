import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import LanguageProviderWrapper from "./components/LanguageProviderWrapper";
import ConditionalLanguageToggle from "./components/ConditionalLanguageToggle";
import NavBarWrapper from "./components/NavBarWrapper";
import OTPCursorFix from "./components/OTPCursorFix";
import AtmosphereBackground from "./components/visual/AtmosphereBackground";
import AppFooter from "./components/AppFooter";
import HtmlLangUpdater from "./components/HtmlLangUpdater";
import { ClerkProvider } from "@clerk/nextjs";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kaparro",
  description: "Find your ideal home — rent or buy with Kaparro",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="el"
        suppressHydrationWarning
        className={`${fraunces.variable} ${outfit.variable} bg-[var(--canvas)]`}
      >
        <body
          suppressHydrationWarning
          className={`relative min-h-screen font-sans antialiased bg-[var(--canvas)] text-[var(--text)] selection:bg-[var(--accent)]/25 selection:text-[var(--text)]`}
        >
          <LanguageProviderWrapper>
            <HtmlLangUpdater />
            <AtmosphereBackground />
            <div className="relative z-10 min-h-screen">
              <OTPCursorFix />
              <ConditionalLanguageToggle />
              <NavBarWrapper>
                <NavBar />
              </NavBarWrapper>
              {/* z-0 keeps page layers below --z-chrome nav (stacking contexts from transforms would otherwise hide the burger) */}
              <main className="relative z-0 min-h-screen">{children}</main>
              <AppFooter />
            </div>
          </LanguageProviderWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
