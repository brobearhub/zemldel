import { Nunito_Sans } from "next/font/google";

export const nunitoSans = Nunito_Sans({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  display: "swap",
  variable: "--font-nunito-sans",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

