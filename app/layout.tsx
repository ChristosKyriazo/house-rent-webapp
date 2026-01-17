import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import LanguageProviderWrapper from "./components/LanguageProviderWrapper";
import ConditionalLanguageToggle from "./components/ConditionalLanguageToggle";
import NavBarWrapper from "./components/NavBarWrapper";
import OTPCursorFix from "./components/OTPCursorFix";
import { ClerkProvider } from "@clerk/nextjs";

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
    <ClerkProvider>
      <html lang="en" className="bg-[#2D3748]">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#2D3748]`}
        >
          <LanguageProviderWrapper>
            <OTPCursorFix />
            <ConditionalLanguageToggle />
            <NavBarWrapper>
              <NavBar />
            </NavBarWrapper>
            {children}
          </LanguageProviderWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
