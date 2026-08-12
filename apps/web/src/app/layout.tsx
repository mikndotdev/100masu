import type { Metadata, Viewport } from "next";
import { Gloria_Hallelujah, M_PLUS_Rounded_1c } from "next/font/google";
import localFont from "next/font/local";
import Providers from "@/components/providers";
import Script from "next/script";
import Footer from "@/components/footer";

import "../index.css";

const mPlusRounded = M_PLUS_Rounded_1c({
  variable: "--font-mplus-rounded",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const gloriaHallelujah = Gloria_Hallelujah({
  variable: "--font-gloria",
  weight: "400",
  subsets: ["latin"],
});

const dseg = localFont({
  variable: "--font-dseg",
  display: "swap",
  src: [
    { path: "../fonts/DSEG14Classic-Regular.woff2", weight: "400" },
    { path: "../fonts/DSEG14Classic-Bold.woff2", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: "百マス計算",
  description: "好きな数字で百マス計算に挑戦！！マルチプレイもできます！",
};

export const viewport: Viewport = {
  themeColor: "#FF7700",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <Script
          defer
          src="https://cdn.mikn.dev/analytics/script"
          data-website-id="34d8778e-f0e2-45b1-aff5-05a818d24326"
          data-host-url="https://analytics.mikandev.com"
        />
      </head>
      <body
        className={`${mPlusRounded.variable} ${gloriaHallelujah.variable} ${dseg.variable} antialiased`}
      >
        <Providers>
          <div className="">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
