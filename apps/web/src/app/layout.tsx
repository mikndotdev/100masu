import type { Metadata } from "next";
import { Geist, Geist_Mono, Gloria_Hallelujah } from "next/font/google";
import Providers from "@/components/providers";

import "../index.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gloriaHallelujah = Gloria_Hallelujah({
  variable: "--font-gloria",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "100masu",
  description: "100masu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${gloriaHallelujah.variable} antialiased`}
      >
        <Providers>
          <div className="">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
