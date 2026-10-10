import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { Box, Button, Container, Paper, Rating, Stack, Typography } from "@mui/material";
import type { PublicProviderProfileDto } from "@/entities/provider";
import { formatReviewCount } from "@/entities/review";
import { ServiceQuickApplyButton } from "@/features/create-service-request-lead";
import { CdnFillImage } from "@/shared/ui/cdn-image";

function ProviderImagePlaceholder({ type }: { type: PublicProviderProfileDto["type"] }) {
  const isCompany = type === "COMPANY";

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        color: "text.secondary",
        backgroundImage:
          "radial-gradient(circle at 50% 40%, rgba(160,180,160,0.22) 0%, rgba(255,255,255,0.32) 55%, rgba(36,71,55,0.10) 100%)",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: { xs: 180, md: 240 },
          height: { xs: 140, md: 180 },
          opacity: 0.95,
        }}
      >
        {isCompany ? (
          <>
            <PersonRoundedIcon
              sx={{
                position: "absolute",
                left: "8%",
                top: "20%",
                fontSize: { xs: 84, md: 108 },
                color: "primary.dark",
                opacity: 0.22,
              }}
            />
            <PersonRoundedIcon
              sx={{
                position: "absolute",
                right: "8%",
                top: "20%",
                fontSize: { xs: 84, md: 108 },
                color: "primary.dark",
                opacity: 0.22,
              }}
            />
            <PersonRoundedIcon
              sx={{
                position: "absolute",
                left: "50%",
                top: "10%",
                transform: "translateX(-50%)",
                fontSize: { xs: 96, md: 124 },
                color: "primary.dark",
                opacity: 0.55,
                filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.08))",
              }}
            />
          </>
        ) : (
          <PersonRoundedIcon
            sx={{
              position: "absolute",
              left: "50%",
              top: "8%",
              transform: "translateX(-50%)",
              fontSize: { xs: 104, md: 140 },
              color: "primary.dark",
              opacity: 0.55,
              filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.08))",
            }}
          />
        )}
      </Box>
    </Box>
  );
}

function providerTypeLabel(type: PublicProviderProfileDto["type"]): string {
  switch (type) {
    case "SELF_EMPLOYED":
      return "Самозанятый / физлицо";
    case "COMPANY":
      return "Компания / организация";
    default:
      return "";
  }
}

type Props = {
  provider: PublicProviderProfileDto;
  serviceId: string;
  isAuthenticated: boolean;
  imageSide?: "left" | "right";
};

export function ServiceProviderSection({ provider, serviceId, isAuthenticated, imageSide = "left" }: Props) {
  const isRight = imageSide === "right";

  return (
    <Box component="section" sx={{ bgcolor: "primary.main", py: { xs: "48px", md: "100px" } }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: isRight ? "row-reverse" : "row" },
            gap: { xs: 3, md: 9 },
            alignItems: { xs: "stretch", md: "center" },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              position: "relative",
              overflow: "hidden",
              bgcolor: "action.hover",
              width: "100%",
              flexGrow: { md: 0 },
              flexShrink: { md: 1 },
              flexBasis: { md: "clamp(120px, 38vw, 300px)" },
              maxWidth: { md: 300 },
              alignSelf: { md: "flex-start" },
              height: { xs: 280, md: "auto" },
              aspectRatio: { xs: "280 / 280", md: "300 / 300" },
              borderRadius: { xs: 2.5, md: 999 },
            }}
          >
            {provider.image ? (
              <CdnFillImage
                src={provider.image}
                sizes="(max-width: 900px) 100vw, 534px"
                unoptimized={process.env.NODE_ENV !== "production"}
                style={{ objectFit: "cover", objectPosition: "center" }}
              />
            ) : (
              <ProviderImagePlaceholder type={provider.type} />
            )}

            <Box
              sx={{
                position: "absolute",
                left: "50%",
                bottom: 18,
                transform: "translate(-50%, 0)",
                display: "inline-flex",
                alignItems: "center",
                gap: { xs: "6px", md: "8px" },
                px: { xs: "1px", md: "10px" },
                py: { xs: "1px", md: "1px" },
                borderRadius: "999px",
                bgcolor: "rgba(255,255,255,0.93)",
              }}
            >
              <Box sx={{ width: { xs: 8, md: 9 }, height: { xs: 8, md: 9 }, borderRadius: "50%", bgcolor: "success.main" }} />
              <Typography variant="caption" sx={{ letterSpacing: "0.4px" }}>
                {provider.availabilityLabel}
              </Typography>
            </Box>
          </Paper>

          <Stack spacing={{ xs: 2, md: 3 }} sx={{ minWidth: 0, flex: { md: "1 1 0" } }}>
            <Stack spacing={0.25}>
              <Typography variant="caption" sx={{ letterSpacing: "0.4px" }}>
                {providerTypeLabel(provider.type)}
              </Typography>
              <Typography 
                variant="h4"
                sx={{ color: "common.white" }}
              >
                {provider.name}
              </Typography>
              <Typography sx={{ fontSize: { xs: 14, md: 16 }, lineHeight: { xs: 1.43, md: 1.75 } }}>
                {provider.subtitle}
              </Typography>
              {provider.rating != null ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", pt: 0.5 }}>
                  <Rating value={provider.rating} precision={0.1} readOnly size="small" sx={{ "& .MuiRating-iconFilled": { color: "#ffb400" } }} />
                  <Typography variant="body2" sx={{ color: "common.white" }}>
                    {provider.rating.toFixed(1)} · {formatReviewCount(provider.reviewCount)}
                  </Typography>
                </Stack>
              ) : null}
            </Stack>

            {provider.about ? (
              <Typography sx={{ color: "common.white", lineHeight: 1.5, fontSize: { xs: 14, md: 16 } }}>
                {provider.about}
              </Typography>
            ) : null}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: { xs: 2, md: 3 },
              }}
            >
              {provider.stats.slice(0, 3).map((s) => (
                <Stack
                  key={`${s.value}-${s.label}`}
                  spacing={0.5}
                  sx={{
                    pt: { xs: 1.5, md: 2.25 },
                    borderTop: "1px solid",
                    borderColor: "rgba(255,255,255,0.18)",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: 24, md: 32 },
                      lineHeight: { xs: 1.334, md: 1.235 },
                      color: "common.white",
                    }}
                  >
                    {s.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#e8efea", letterSpacing: "0.4px" }}>
                    {s.label}
                  </Typography>
                </Stack>
              ))}
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1, md: 3 }} sx={{ alignItems: { md: "center" } }}>
              <ServiceQuickApplyButton
                serviceId={serviceId}
                isAuthenticated={isAuthenticated}
                sx={{
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.46px",
                  py: "8px",
                  px: "22px",
                  minWidth: { xs: "100%", md: "auto" },
                  boxShadow:
                    "0px 1px 5px rgba(0,0,0,0.12), 0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px -2px rgba(0,0,0,0.2)",
                  "&:hover": { bgcolor: "grey.900" },
                }}
              />

              <Button
                variant="text"
                sx={{
                  color: "secondary.main",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.46px",
                  py: { xs: "6px", md: "8px" },
                  px: { xs: "8px", md: "11px" },
                  minWidth: { xs: "100%", md: "auto" },
                }}
                component="a"
                href={`/providers/${provider.slug}`}
              >
                профиль и отзывы
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

