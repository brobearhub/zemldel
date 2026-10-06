import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { BackendApiError, fetchBackendJson } from "@/shared/api/backend/server";
import { SITE_STICKY_TOP_PX } from "@/shared/config/site-layout";
import { getServerAuthSession } from "@/core/auth";
import type { ServiceDto } from "@/entities/service";
import { PublicUnlinkedRequestForm } from "@/widgets/public-service/ui/PublicUnlinkedRequestForm";
import { ServiceCategoriesStickyBar } from "@/widgets/service-categories/ui/ServiceCategoriesStickyBar";
import { ServicesByCity } from "@/widgets/services/ui/ServicesByCity";

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
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
  let services: ServiceDto[];
  let categories: ServiceCategoryRow[];

  try {
    [category, services, categories] = await Promise.all([
      fetchBackendJson<ServiceCategoryRow>(`/service-categories/${id}`),
      fetchBackendJson<ServiceDto[]>("/services"),
      fetchBackendJson<ServiceCategoryRow[]>("/service-categories"),
    ]);
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      notFound();
    }
    throw e;
  }

  const isRoot = category.parentId == null;
  const templates = categories.filter((c) => c.parentId === category.id);
  const siblings =
    category.parentId == null
      ? []
      : categories
          .filter((c) => c.parentId === category.parentId)
          .sort((a, b) => {
            const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
            const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
            if (ao !== bo) return ao - bo;
            return a.name.localeCompare(b.name, "ru");
          });
  const templateBarItems = [
    { id: "__back__", name: "←", href: "/" },
    ...templates.map((t) => ({
      id: t.id,
      name: t.name,
      href: `/service-categories/${t.id}`,
    })),
  ];
  const templateSelfBarItems = category.parentId
    ? [
        {
          id: "__back__",
          name: "←",
          href: category.parentId ? `/service-categories/${category.parentId}` : "/",
        },
        ...siblings.map((s) => ({
          id: s.id,
          name: s.name,
          href: `/service-categories/${s.id}`,
        })),
      ]
    : [];
  const allowedCategoryIds = isRoot ? new Set(templates.map((c) => c.id)) : new Set([category.id]);

  const scopedServices = services.filter((s) => allowedCategoryIds.has(s.categoryId));

  return (
    <main>
      <Box
        component="section"
        sx={{
          pt: 0,
          pb: { xs: 4, md: 6 },
          bgcolor: "background.default",
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={3}>
            {isRoot ? (
              <ServiceCategoriesStickyBar items={templateBarItems} />
            ) : category.parentId ? (
              <ServiceCategoriesStickyBar items={templateSelfBarItems} activeId={category.id} />
            ) : null}

            <Box>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 900 }} color="primary">
                {category.name}
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
                {!scopedServices.length ? (
                  <Paper variant="outlined" sx={{ p: 2.5 }}>
                    <Typography sx={{ color: "text.secondary" }}>
                      Пока нет опубликованных услуг в этой категории.
                    </Typography>
                  </Paper>
                ) : (
                  <ServicesByCity items={scopedServices} />
                )}
              </Box>

              <Box
                sx={{
                  order: { xs: 1, md: 1 },
                  alignSelf: "start",
                  position: { md: "sticky" },
                  top: { md: SITE_STICKY_TOP_PX },
                }}
              >
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Typography sx={{ fontWeight: 900 }}>Опишите задачу</Typography>
                    <PublicUnlinkedRequestForm
                      variant="bare"
                      isAuthenticated={Boolean(session?.user?.id)}
                      categories={
                        isRoot
                          ? templates.map((t) => ({ id: t.id, name: t.name }))
                          : [{ id: category.id, name: category.name }]
                      }
                      initialCategory={isRoot ? undefined : { id: category.id, name: category.name }}
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

