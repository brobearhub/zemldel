import { Container, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ServiceCategoriesAdminClient } from "../ui/ServiceCategoriesAdminClient";

export type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
  placements: Array<"HOME">;
};

export default async function AdminServiceCategoriesListPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) notFound();

  let categories: ServiceCategoryRow[];
  try {
    categories = await fetchBackendJsonAsUser<ServiceCategoryRow[]>(
      "/admin/service-categories",
      session.user.id
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  return (
    <main>
      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Категории услуг
          </Typography>
          <ServiceCategoriesAdminClient initialCategories={categories} />
        </Stack>
      </Container>
    </main>
  );
}

