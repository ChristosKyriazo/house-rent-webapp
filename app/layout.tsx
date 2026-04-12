import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import LanguageProviderWrapper from "./components/LanguageProviderWrapper";
import ConditionalLanguageToggle from "./components/ConditionalLanguageToggle";
import NavBarWrapper from "./components/NavBarWrapper";
import OTPCursorFix from "./components/OTPCursorFix";
import AtmosphereBackground from "./components/visual/AtmosphereBackground";
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
  title: "House Rent Webapp",
  description: "Find your perfect rental or list your property",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${fraunces.variable} ${outfit.variable} bg-[var(--canvas)]`}
      >
        <body
          className={`relative min-h-screen font-sans antialiased bg-[var(--canvas)] text-[var(--text)] selection:bg-[var(--accent)]/25 selection:text-[var(--text)]`}
        >
          <LanguageProviderWrapper>
            <AtmosphereBackground />
            <div className="relative z-10 min-h-screen">
              <OTPCursorFix />
              <ConditionalLanguageToggle />
              <NavBarWrapper>
                <NavBar />
              </NavBarWrapper>
              {/* z-0 keeps page layers below --z-chrome nav (stacking contexts from transforms would otherwise hide the burger) */}
              <main className="relative z-0 min-h-screen">{children}</main>
            </div>
          </LanguageProviderWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
