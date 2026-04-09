import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { BackendApiError, fetchBackendJson } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ServiceCard, type ServiceCardItem } from "@/entities/service";
import { PublicTemplateRequestForm } from "@/widgets/public-service/ui/PublicTemplateRequestForm";

type ServiceTemplateRow = {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  paletteColor: string | null;
  icon: string | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const tpl = await fetchBackendJson<ServiceTemplateRow>(`/service-templates/${id}`);
    return {
      title: `${tpl.title} — Новые горизонты`,
      description: tpl.description ?? undefined,
    };
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      return { title: "Услуга" };
    }
    return { title: "Услуга" };
  }
}

export default async function ServiceTemplatePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();

  let template: ServiceTemplateRow;
  let services: ServiceCardItem[];

  try {
    [template, services] = await Promise.all([
      fetchBackendJson<ServiceTemplateRow>(`/service-templates/${id}`),
      fetchBackendJson<ServiceCardItem[]>(`/service-templates/${id}/providers`),
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
                {template.title}
              </Typography>
              {template.description ? (
                <Typography sx={{ color: "text.secondary", mt: 1, maxWidth: 860 }}>
                  {template.description}
                </Typography>
              ) : null}
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
                      Пока нет опубликованных услуг по этому шаблону.
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
                    <PublicTemplateRequestForm
                      templateId={template.id}
                      isAuthenticated={Boolean(session?.user?.id)}
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

