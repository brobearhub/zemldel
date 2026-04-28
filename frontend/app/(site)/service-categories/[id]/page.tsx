import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { BackendApiError, fetchBackendJson } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ServiceCard, type ServiceCardItem } from "@/entities/service";
import { PublicUnlinkedRequestForm } from "@/widgets/public-service/ui/PublicUnlinkedRequestForm";

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
  placements: Array<"HOME">;
};

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const cat = await fetchBackendJson<ServiceCategoryRow>(`/service-categories/${id}`);
    return {
      title: `${cat.name} — Земледел`,
      description: `Исполнители и услуги в категории «${cat.name}».`,
    };
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      return { title: "Категория" };
    }
    return { title: "Категория" };
  }
}

export default async function ServiceCategoryPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();

  let category: ServiceCategoryRow;
  let services: ServiceCardItem[];

  try {
    [category, services] = await Promise.all([
      fetchBackendJson<ServiceCategoryRow>(`/service-categories/${id}`),
      fetchBackendJson<ServiceCardItem[]>(`/service-categories/${id}/providers`),
    ]);
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      notFound();
    }
    throw e;
  }

  return (
    <main>
      <Box
        component="section"
        sx={{
          py: { xs: 4, md: 6 },
          pt: { xs: 14, md: 16 },
          bgcolor: "background.default",
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Box>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 900 }} color="primary">
                {category.name}
              </Typography>
              <Typography sx={{ color: "text.secondary", mt: 1, maxWidth: 860 }}>
                Выберите исполнителя или оставьте заявку по категории — компании из вашего региона смогут откликнуться.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gap: { xs: 2, md: 3 },
                alignItems: "start",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(0, 1fr) 420px",
                },
              }}
            >
              <Box sx={{ minWidth: 0, order: { xs: 2, md: 0 } }}>
                {!services.length ? (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                    <Typography sx={{ color: "text.secondary" }}>
                      Пока нет опубликованных услуг в этой категории.
                    </Typography>
                  </Paper>
                ) : (
                  <Box
                    sx={{
                      display: "grid",
                      gap: { xs: 2, md: 3 },
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(3, minmax(0, 1fr))",
                      },
                      alignItems: "stretch",
                    }}
                  >
                    {services.map((item) => (
                      <ServiceCard key={item.id} item={item} />
                    ))}
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  order: { xs: 1, md: 1 },
                  alignSelf: "start",
                  position: { md: "sticky" },
                  top: { md: 96 },
                }}
              >
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
                  <Stack spacing={2}>
                    <Typography sx={{ fontWeight: 900 }}>Опишите задачу</Typography>
                    <PublicUnlinkedRequestForm
                      variant="bare"
                      isAuthenticated={Boolean(session?.user?.id)}
                      categories={[{ id: category.id, name: category.name }]}
                      initialCategory={{ id: category.id, name: category.name }}
                    />
                  </Stack>
                </Paper>
              </Box>
            </Box>
          </Stack>
        </Container>
      </Box>
    </main>
  );
}

