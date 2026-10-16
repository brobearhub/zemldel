import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar, Box, Card, CardContent, CardHeader, Container, Rating, Stack, Typography } from "@mui/material";
import { ServiceCard, type ServiceDto } from "@/entities/service";
import { getPublicProviderBySlug } from "@/entities/provider/api/provider.server";
import { listPublicProviderReviews } from "@/entities/review/api/review.server";
import { fetchBackendJson } from "@/shared/api/backend/server";
import { SITE_CONTENT_GAP_PX, SITE_PAGE_PB } from "@/shared/config/site-layout";
import { displayCityName } from "@/shared/lib/format-city-label";
import { siteOrigin } from "@/shared/lib/site-origin";
import { ProviderPublicHero } from "@/views/provider-page";
import { HomeStoriesStrip } from "@/widgets/home-stories";

type Props = { params: Promise<{ slug: string }> };

/** 4 колонки с lg, на каждом более узком брейкпоинте на одну меньше. */
const catalogGridColumns = {
  xs: "minmax(0, 1fr)",
  sm: "repeat(2, minmax(0, 1fr))",
  md: "repeat(3, minmax(0, 1fr))",
  lg: "repeat(4, minmax(0, 1fr))",
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getPublicProviderBySlug(slug);
  if (!provider) return { title: "Исполнитель" };
  const services = await fetchBackendJson<ServiceDto[]>(
    `/services?providerId=${encodeURIComponent(provider.id)}`,
  ).catch(() => []);
  const city = provider.city?.name ? displayCityName(provider.city.name) : null;
  const serviceTitle = services.find((service) => service.title.trim())?.title.trim() ?? null;
  const title = serviceTitle
    ? [serviceTitle, city, provider.name].filter(Boolean).join(" — ")
    : [provider.name, city].filter(Boolean).join(" — ");
  const serviceNames = services
    .map((service) => service.title.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const description =
    provider.about?.trim() ||
    (serviceNames
      ? `${serviceNames}${city ? ` в городе ${city}` : ""}. ${provider.name}.`
      : provider.subtitle?.trim() || undefined);
  const indexable = services.length > 0 || Boolean(description);
  const url = `${siteOrigin()}/providers/${provider.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title, description, url, type: "profile" },
  };
}

export default async function ProviderPublicPage({ params }: Props) {
  const { slug } = await params;
  const provider = await getPublicProviderBySlug(slug);
  if (!provider) notFound();

  const [reviews, services] = await Promise.all([
    listPublicProviderReviews(provider.id).catch(() => ({ items: [], nextCursor: null })),
    fetchBackendJson<ServiceDto[]>(`/services?providerId=${encodeURIComponent(provider.id)}`).catch(() => []),
  ]);
  const city = provider.city?.name ? displayCityName(provider.city.name) : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: provider.name,
    ...(provider.about?.trim() ? { description: provider.about.trim() } : {}),
    ...(city ? { address: { "@type": "PostalAddress", addressLocality: city } } : {}),
  };

  return (
    <Box>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Box
        sx={{
          bgcolor: "primary.main",
          // Why: spacer под шапкой оставляет кремовый зазор; полоса primary должна начинаться сразу под хедером.
          mt: { xs: `-${SITE_CONTENT_GAP_PX.xs}px`, sm: `-${SITE_CONTENT_GAP_PX.sm}px` },
          py: { xs: 4, md: 8 },
        }}
      >
        <Container maxWidth="lg">
          <ProviderPublicHero provider={provider} />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 }, pb: SITE_PAGE_PB }}>
        <HomeStoriesStrip providerId={provider.id} />
        <Stack spacing={4}>
          <Stack spacing={2}>
            <Typography variant="h5">Услуги</Typography>
            {services.length === 0 ? (
              <Typography sx={{ color: "text.secondary" }}>Пока нет услуг.</Typography>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gap: 2.5,
                  gridTemplateColumns: catalogGridColumns,
                  alignItems: "stretch",
                }}
              >
                {services.map((service) => (
                  <ServiceCard key={service.id} item={service} />
                ))}
              </Box>
            )}
          </Stack>

          <Stack spacing={2}>
            <Typography variant="h5">Отзывы</Typography>
            {reviews.items.length === 0 ? (
              <Typography sx={{ color: "text.secondary" }}>Пока нет отзывов.</Typography>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gap: 2.5,
                  gridTemplateColumns: catalogGridColumns,
                  alignItems: "stretch",
                }}
              >
                {reviews.items.map((review) => (
                  <Card key={review.id} variant="outlined" sx={{ height: "100%" }}>
                    <CardHeader
                      avatar={<Avatar>{review.authorDisplayName.slice(0, 1)}</Avatar>}
                      title={review.authorDisplayName}
                      subheader={review.serviceTitle ?? undefined}
                    />
                    <CardContent>
                      <Stack spacing={1}>
                        <Rating value={review.rating} readOnly size="small" />
                        {review.text ? <Typography>{review.text}</Typography> : null}
                        {review.replyText ? (
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            Ответ: {review.replyText}
                          </Typography>
                        ) : null}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
