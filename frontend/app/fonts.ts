import { Google_Sans } from "next/font/google";

export const googleSans = Google_Sans({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  display: "swap",
  variable: "--font-google-sans",
  weight: "variable",
  adjustFontFallback: false,
});

