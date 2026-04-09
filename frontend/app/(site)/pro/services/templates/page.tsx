import { Container, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { BackendApiError, fetchBackendJson, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ProServiceTemplatesClient } from "@/widgets/pro-services/ui/ProServiceTemplatesClient";

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

type ServiceTemplateRow = {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  paletteColor: string | null;
  icon: string | null;
  isAdded: boolean;
};

export default async function ProServiceTemplatesPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) notFound();

  try {
    const [categories, templates] = await Promise.all([
      fetchBackendJson<ServiceCategoryRow[]>("/service-categories"),
      fetchBackendJsonAsUser<ServiceTemplateRow[]>("/pro/service-templates", session.user.id),
    ]);

    return (
      <main>
        <Container sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={3}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Шаблонные услуги
            </Typography>
            <ProServiceTemplatesClient initialCategories={categories} initialTemplates={templates} />
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

