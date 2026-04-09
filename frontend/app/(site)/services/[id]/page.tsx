import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import type { ServiceDto } from "@/entities/service";
import { BackendApiError, fetchBackendJson } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { PublicServiceRequestForm } from "@/widgets/public-service/ui/PublicServiceRequestForm";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let service: Pick<ServiceDto, "title" | "description"> | null = null;

  try {
    service = await fetchBackendJson<ServiceDto>(`/services/${id}`);
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      return { title: "Услуга" };
    }
    console.error("Error fetching service metadata:", e);
  }

  if (!service) return { title: "Услуга" };
  return {
    title: `${service.title} — Новые горизонты`,
    description: service.description ?? undefined,
  };
}

export default async function ServicePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();
  let service: ServiceDto | null = null;

  try {
    service = await fetchBackendJson<ServiceDto>(`/services/${id}`);
  } catch (e) {
    if (e instanceof BackendApiError && e.status === 404) {
      notFound();
    }
    console.error("Error fetching service:", e);
  }

  if (!service) notFound();

  const shortDescription =
    service.description ??
    (service.category?.slug === "main" ? service.title : `${service.title}. ${service.price}.`);

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
        <Container>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(320px, 400px) 1fr" },
              gap: { xs: 3, md: 4 },
              alignItems: "start",
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "4/3",
                borderRadius: 1.5,
                overflow: "hidden",
                bgcolor: "action.hover",
              }}
            >
              {service.image ? (
                <Image
                  src={service.image}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 400px"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.disabled",
                  }}
                >
                  <Typography component="span" variant="h4">
                    Фото
                  </Typography>
                </Box>
              )}
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 3,
                alignItems: { xs: "stretch", md: "flex-start" },
              }}
            >
              <Stack spacing={1.5} sx={{ flex: { md: "1 1 0%" }, minWidth: 0 }}>
                <Typography
                  component="h1"
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}
                  color="primary"
                >
                  {service.title}
                </Typography>
                <Typography
                  sx={{
                    color: "text.secondary",
                    lineHeight: 1.6,
                    maxWidth: 640,
                  }}
                >
                  {shortDescription}
                </Typography>
              </Stack>

              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 1.5,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  flexShrink: 0,
                }}
              >
                <Stack spacing={2} alignItems="flex-start">
                  <Typography
                    component="span"
                    sx={{ fontSize: 28, fontWeight: 800 }}
                    color="primary"
                  >
                    {service.price}
                  </Typography>
                  <PublicServiceRequestForm
                    serviceId={service.id}
                    ctaText={service.ctaText}
                    ctaHref={service.ctaHref}
                    initialCustomerName={session?.user?.name ?? null}
                    initialCustomerEmail={session?.user?.email ?? null}
                    isAuthenticated={Boolean(session?.user?.id)}
                  />
                </Stack>
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>
    </main>
  );
}

