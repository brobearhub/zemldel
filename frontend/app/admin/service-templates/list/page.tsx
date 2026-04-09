import { Container, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ServiceTemplatesAdminClient } from "../ui/ServiceTemplatesAdminClient";

export type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

export type ServiceTemplateRow = {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  paletteColor: string | null;
  icon: string | null;
};

export default async function AdminServiceTemplatesListPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) notFound();

  try {
    const [categories, templates] = await Promise.all([
      fetchBackendJsonAsUser<ServiceCategoryRow[]>("/admin/service-categories", session.user.id),
      fetchBackendJsonAsUser<ServiceTemplateRow[]>("/admin/service-templates", session.user.id),
    ]);

    return (
      <main>
        <Container sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={3}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Шаблонные услуги
            </Typography>
            <ServiceTemplatesAdminClient initialCategories={categories} initialTemplates={templates} />
          </Stack>
        </Container>
      </main>
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }
    throw error;
  }
}

