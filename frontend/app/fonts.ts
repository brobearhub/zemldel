import { Ysabeau_Infant } from "next/font/google";

/** Primary UI font — loaded once via `next/font` (see root layout). */
export const ysabeauInfant = Ysabeau_Infant({
  weight: "variable",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  display: "swap",
  variable: "--font-ysabeau-infant",
});
