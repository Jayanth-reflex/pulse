import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/lib/motion/MotionProvider";
import { SwrProvider } from "@/lib/swr/SwrProvider";
import { SmoothScroll } from "@/components/system/SmoothScroll";
import { Grain } from "@/components/system/Grain";

// Editorial serif display — organic, optical-sized, a touch of warmth.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

// Clean grotesque body — quiet, legible, modern.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pulse — a living atlas of global health",
  description:
    "A living garden of global health. Diseases grow as species, outbreaks open as blooms, trends turn with the seasons — built from live public data.",
  applicationName: "Pulse",
  authors: [{ name: "Jayanth" }],
  keywords: [
    "global health",
    "data visualization",
    "WebGL",
    "WHO",
    "Our World in Data",
    "disease.sh",
  ],
  openGraph: {
    title: "Pulse — a living atlas of global health",
    description:
      "Diseases as species, outbreaks as blooms, trends as seasons. A cinematic, frontend-only atlas of live public-health data.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a120e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <MotionProvider>
          <SwrProvider>
            <SmoothScroll />
            {children}
            <Grain />
          </SwrProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
