import { Suspense } from "react";
import { LandCatalog } from "@/widgets/lands/LandCatalog";
import { publicPageMetadata } from "@/shared/lib/seo";
export const metadata = publicPageMetadata(
  "Участки",
  "Продажа земельных участков, долей, уступка аренды и услуги подбора участка на Земледеле.",
  "/lands",
);
export default function LandsPage() {
  return (
    <Suspense>
      <LandCatalog />
    </Suspense>
  );
}
