import { Suspense } from "react";
import { LandDetail } from "@/widgets/lands/LandDetail";
import { BackendApiError, fetchBackendJson } from "@/shared/api/backend/server";
import { publicPageMetadata } from "@/shared/lib/seo";
import { getServerAuthSession } from "@/core/auth";
import { notFound } from "next/navigation";
import type { LandListing } from "@/entities/land/types";
const validId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!validId(id)) return { title: "Участок", robots: { index: false } };
  try {
    const row = await fetchBackendJson<LandListing>(`/lands/${id}`);
    return row.status === "PUBLISHED"
      ? publicPageMetadata(
          row.title,
          row.description.slice(0, 160),
          `/lands/${id}`,
        )
      : { title: "Участок", robots: { index: false } };
  } catch (error) {
    if (!(error instanceof BackendApiError && error.status === 404))
      throw error;
    return { title: "Участок", robots: { index: false } };
  }
}
export default async function LandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!validId(id)) notFound();
  const session = await getServerAuthSession();
  return (
    <Suspense>
      <LandDetail
        id={id}
        admin={session?.user?.systemRole === "PLATFORM_ADMIN"}
      />
    </Suspense>
  );
}
