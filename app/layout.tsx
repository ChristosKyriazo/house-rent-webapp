import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import NavBar from "./components/NavBar";
import ConditionalNavBar from "./components/ConditionalNavBar";
import LanguageProviderWrapper from "./components/LanguageProviderWrapper";
import ConditionalLanguageToggle from "./components/ConditionalLanguageToggle";
import HtmlLangUpdater from "./components/HtmlLangUpdater";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="el">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <LanguageProviderWrapper>
            <HtmlLangUpdater />
            <ConditionalNavBar>
              <NavBar />
            </ConditionalNavBar>
            <ConditionalLanguageToggle />
            {children}
          </LanguageProviderWrapper>
        </ClerkProvider>
      </body>
    </html>
  );
}
