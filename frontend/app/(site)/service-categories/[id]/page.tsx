import type { Metadata } from "next";
import Link from "@/shared/ui/Link";
import { notFound, permanentRedirect } from "next/navigation";
import { Box, Breadcrumbs, Container, Paper, Stack, Typography } from "@mui/material";
import { BackendApiError, fetchBackendJson } from "@/shared/api/backend/server";
import { SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
import { getServerAuthSession } from "@/core/auth";
import type { ServiceDto } from "@/entities/service";
import { getCategoryGuide } from "@/entities/service-category/model/category-guides";
import { CategoryGuideSection } from "@/widgets/service-categories/ui/CategoryGuideSection";
import { publicPageMetadata, serializeJsonLd } from "@/shared/lib/seo";
import { siteOrigin } from "@/shared/lib/site-origin";
import { PublicUnlinkedRequestForm } from "@/widgets/public-service/ui/PublicUnlinkedRequestForm";
import { ServiceCategoriesStickyBar } from "@/widgets/service-categories/ui/ServiceCategoriesStickyBar";
import { SERVICE_CATEGORIES_BAR_HEIGHT_VAR } from "@/widgets/service-categories/ui/service-categories-bar-height";
import { ServicesByCity } from "@/widgets/services/ui/ServicesByCity";

type ServiceCategoryRow = {
  id: string;
  name: string;
  shortName?: string | null;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

async function getCategory(id: string) {
  try {
    return await fetchBackendJson<ServiceCategoryRow>(`/service-categories/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const category = await getCategory(id);
  const guide = getCategoryGuide(category.slug);
  return publicPageMetadata(
    `${category.name} — Земледел`,
    guide?.description ?? `Услуги в категории «${category.name}». Выберите предложение или опишите свою задачу исполнителю.`,
    `/service-categories/${category.id}`,
  );
}

export default async function ServiceCategoryPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();

  let category: ServiceCategoryRow;
  let services: ServiceDto[];
  let categories: ServiceCategoryRow[];

  try {
    [category, services, categories] = await Promise.all([
      getCategory(id),
      fetchBackendJson<ServiceDto[]>("/services"),
      fetchBackendJson<ServiceCategoryRow[]>("/service-categories"),
    ]);
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      notFound();
    }
    throw e;
  }

  // The API accepts both IDs and slugs. Keep one public URL for the same category.
  if (id !== category.id) permanentRedirect(`/service-categories/${category.id}`);
  const guide = getCategoryGuide(category.slug);
  const parent = categories.find((item) => item.id === category.parentId);

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
      shortName: t.shortName,
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
          shortName: s.shortName,
          href: `/service-categories/${s.id}`,
        })),
      ]
    : [];
  const allowedCategoryIds = new Set([category.id, ...templates.map((c) => c.id)]);

  const scopedServices = services.filter((s) => allowedCategoryIds.has(s.categoryId));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { name: "Главная", item: siteOrigin() },
            ...(parent ? [{ name: parent.name, item: `${siteOrigin()}/service-categories/${parent.id}` }] : []),
            { name: category.name, item: `${siteOrigin()}/service-categories/${category.id}` },
          ].map((item, index) => ({ "@type": "ListItem", position: index + 1, ...item })),
        }) }}
      />
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
            <Breadcrumbs aria-label="Навигация по категориям">
              <Link
                href="/"
              >
                Главная
              </Link>
              {parent ? (
                <Link
                  href={`/service-categories/${parent.id}`}
                >
                  {parent.name}
                </Link>
              ) : null}
              <Typography>{category.name}</Typography>
            </Breadcrumbs>
            <Box>
              <Typography
                component="h1"
                variant="h4"
                sx={{ fontWeight: 900 }}
                color="primary"
              >
                {category.name}
              </Typography>
              {guide ? (
                <Typography
                  sx={{
                    mt: 2,
                    maxWidth: 900,
                    lineHeight: 1.75,
                  }}
                >
                  {guide.intro}
                </Typography>
              ) : null}
            </Box>

            {isRoot ? (
              <ServiceCategoriesStickyBar items={templateBarItems} />
            ) : category.parentId ? (
              <ServiceCategoriesStickyBar items={templateSelfBarItems} activeId={category.id} />
            ) : null}

            <Link
              href="#category-request"
              sx={{ alignSelf: "flex-start" }}
            >
              Обсудить задачу с исполнителем
            </Link>

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
              <Stack
                spacing={4}
                sx={{ minWidth: 0 }}
              >
                {!scopedServices.length ? (
                  <Paper
                    variant="outlined"
                    sx={{ p: 2.5 }}
                  >
                    <Typography sx={{ color: "text.secondary" }}>
                      В этой категории пока нет опубликованных предложений. Опишите задачу в форме,
                      чтобы обсудить подходящий состав работ.
                    </Typography>
                  </Paper>
                ) : (
                  <ServicesByCity items={scopedServices} />
                )}
                {guide ? (
                  <CategoryGuideSection
                    guide={guide}
                    childrenCategories={templates}
                  />
                ) : null}
              </Stack>

              <Box
                id="category-request"
                sx={{
                  scrollMarginTop: `calc(${SITE_HEADER_HEIGHT_PX.sm}px + var(${SERVICE_CATEGORIES_BAR_HEIGHT_VAR}, 0px) + 16px)`,
                  alignSelf: "start",
                  position: { md: "sticky" },
                  top: {
                    md: `calc(${SITE_HEADER_HEIGHT_PX.sm}px + var(${SERVICE_CATEGORIES_BAR_HEIGHT_VAR}, 0px))`,
                  },
                }}
              >
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Typography
                      component="h2"
                      variant="h6"
                      sx={{ fontWeight: 900 }}
                    >
                      Опишите задачу
                    </Typography>
                    <PublicUnlinkedRequestForm
                      variant="bare"
                      isAuthenticated={Boolean(session?.user?.id)}
                      categories={
                        isRoot
                          ? templates.map((t) => ({ id: t.id, name: t.name }))
                          : [{ id: category.id, name: category.name }]
                      }
                      sectionCategory={isRoot ? { id: category.id, name: category.name } : null}
                      initialCategory={isRoot ? undefined : { id: category.id, name: category.name }}
                    />
                  </Stack>
                </Paper>
              </Box>
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}

