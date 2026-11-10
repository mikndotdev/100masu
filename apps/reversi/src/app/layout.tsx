import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";

import Footer from "@/components/footer";
import Providers from "@/components/providers";

import "../index.css";

const mPlusRounded = M_PLUS_Rounded_1c({
  variable: "--font-mplus-rounded",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "リバーシ",
  description: "友達とオンラインでリバーシ対戦！",
};

export const viewport: Viewport = {
  themeColor: "#FF7700",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${mPlusRounded.variable} antialiased`}>
        <Providers>
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
