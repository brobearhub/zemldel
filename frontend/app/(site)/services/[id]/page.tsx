import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import type { ServiceDto } from "@/entities/service";
import { BackendApiError, fetchBackendJson } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
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
    title: `${service.title} — Земледел`,
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
          pb: { xs: 4, md: 6 },
          pt: 0,
          bgcolor: "background.default",
          // Keep `sx` serializable for Server Components (no functions).
          backgroundImage:
            "radial-gradient(1200px 800px at 70% 35%, rgb(var(--mui-palette-primary-mainChannel) / 0.22) 0%, rgb(var(--mui-palette-info-mainChannel) / 0.10) 40%, rgb(var(--mui-palette-background-defaultChannel) / 0) 70%)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(320px, 420px) minmax(0, 1fr) 440px",
              },
              gap: { xs: 3, md: 4.5 },
              alignItems: "start",
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "background.paper",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: { xs: "16/10", md: "4/3" },
                  bgcolor: "action.hover",
                }}
              >
                {service.image ? (
                  <Image
                    src={service.image}
                    alt=""
                    fill
                    sizes="(max-width: 900px) 100vw, 420px"
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
            </Paper>

            <Stack spacing={1.5} sx={{ minWidth: 0, pt: { xs: 0, md: 0.5 } }}>
              <Typography
                component="h1"
                variant="h3"
                sx={{
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.08,
                  maxWidth: 980,
                }}
                color="primary"
              >
                {service.title}
              </Typography>
              <Typography
                sx={{
                  color: "text.secondary",
                  lineHeight: 1.7,
                  fontSize: { xs: 15, md: 16 },
                  maxWidth: 860,
                }}
              >
                {shortDescription}
              </Typography>
            </Stack>

            <Box sx={{ position: { md: "sticky" }, top: { md: 96 }, alignSelf: "start" }}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2.5, md: 3 },
                  borderRadius: 2,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
                }}
              >
                <Stack spacing={2} alignItems="flex-start">
                  <Typography component="span" sx={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em" }} color="primary">
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

