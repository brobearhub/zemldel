import { LandEditor } from "@/widgets/lands/LandEditor";
export const metadata = {
  title: "Разместить объявление об участке",
  robots: { index: false },
};
export default async function NewLandPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  return (
    <LandEditor initialKind={kind === "SELECTION" ? "SELECTION" : "SALE"} />
  );
}
