import Image from "next/image";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import { Box, Button, Container, Divider, Paper, Rating, Stack, Typography } from "@mui/material";
import type { ServiceHeroVm } from "@/widgets/service-page/model/service-hero.vm";

type Props = {
  vm: ServiceHeroVm;
};

export function ServiceHeroSection({ vm }: Props) {
  return (
    <Box component="section" sx={{ bgcolor: "background.default", pt: { xs: 2.5, md: 4 }, pb: { xs: 4, md: 6 } }}>
      <Container maxWidth="xl">
        <Stack spacing={{ xs: 2, md: 3.5 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Button
              component="a"
              href={vm.backHref}
              variant="outlined"
              size="small"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{
                alignSelf: "flex-start",
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Назад
            </Button>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 724px) minmax(0, 1fr)" },
              gap: { xs: 2.5, md: 8 },
              alignItems: { md: "center" },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                position: "relative",
                overflow: "hidden",
                bgcolor: "action.hover",
                aspectRatio: { xs: "16/10", md: "724 / 522" },
              }}
            >
              {vm.imageUrl ? (
                <Image
                  src={vm.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 724px"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              ) : (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.disabled",
                    fontWeight: 700,
                  }}
                >
                  Фото
                </Box>
              )}

              {vm.imageBadgeLabel ? (
                <Box
                  sx={{
                    position: "absolute",
                    left: { xs: 16, md: 28 },
                    bottom: { xs: 16, md: 28 },
                    display: "inline-flex",
                    px: { xs: 1.5, md: 2 },
                    py: { xs: 1, md: 1.25 },
                    borderRadius: "999px",
                    bgcolor: "rgba(255,255,255,0.95)",
                    color: "primary.main",
                    fontSize: { xs: 12, md: 14 },
                    fontWeight: 600,
                    lineHeight: 1.4,
                    backdropFilter: "blur(2px)",
                  }}
                >
                  {vm.imageBadgeLabel}
                </Box>
              ) : null}
            </Paper>

            <Stack spacing={{ xs: 1.5, md: 2.25 }} sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  px: { xs: 1.5, md: 1.75 },
                  py: { xs: 0.75, md: 0.875 },
                  borderRadius: "999px",
                  bgcolor: "#e4ece4",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "primary.dark",
                    letterSpacing: "0.4px",
                  }}
                >
                  {vm.categoryLabel}
                </Typography>
              </Box>

              <Typography
                component="h1"
                sx={{
                  fontWeight: 600,
                  letterSpacing: { xs: "-0.5px", md: "-1.5px" },
                  lineHeight: { xs: 1.2, md: 1.167 },
                  fontSize: { xs: 28, md: 48 },
                  color: "primary.main",
                }}
              >
                {vm.title}
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2.5 }} sx={{ alignItems: { sm: "center" } }}>
                {vm.cityLabel ? (
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                    <LocationOnRoundedIcon sx={{ fontSize: { xs: 18, md: 22 }, color: "primary.main" }} />
                    <Typography variant="body2" sx={{ color: "primary.main" }}>
                      {vm.cityLabel}
                    </Typography>
                  </Stack>
                ) : null}

                {vm.rating ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Rating
                      value={vm.rating.value}
                      readOnly
                      precision={0.1}
                      size="small"
                      sx={{
                        "& .MuiRating-iconFilled": { color: "#ffb400" },
                      }}
                    />
                    <Typography variant="body2" sx={{ color: "primary.main" }}>
                      {vm.rating.value.toFixed(1)}
                    </Typography>
                    {vm.rating.reviewCount != null ? (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {vm.rating.reviewCount} отзывов
                      </Typography>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>

              {vm.description ? (
                <Typography sx={{ color: "text.secondary", lineHeight: { xs: 1.43, md: 1.5 }, fontSize: { xs: 14, md: 16 } }}>
                  {vm.description}
                </Typography>
              ) : null}

              {vm.benefits.length ? (
                <Stack spacing={1} sx={{ maxWidth: 360 }}>
                  {vm.benefits.map((b) => (
                    <Stack key={b} direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                      <Box
                        sx={{
                          mt: "3px",
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          bgcolor: "success.main",
                          opacity: 0.12,
                        }}
                      />
                      <Typography variant="body2" sx={{ color: "primary.main", lineHeight: 1.43 }}>
                        {b}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : null}

              <Divider sx={{ display: { xs: "block", md: "none" }, my: 0.5 }} />

              <Box
                sx={{
                  display: "flex",
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <Stack spacing={0.25} sx={{ whiteSpace: "nowrap" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.4px" }}>
                    Стоимость услуги
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: 36, md: 48 },
                      lineHeight: 1.167,
                      color: "#745448",
                    }}
                  >
                    {vm.priceLabel}
                  </Typography>
                </Stack>

                <Button
                  component="a"
                  href={vm.ctaAnchorHref}
                  variant="contained"
                  size="large"
                  sx={{
                    px: 3,
                    py: 1,
                    fontWeight: 600,
                    letterSpacing: "0.46px",
                    textTransform: "uppercase",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    boxShadow:
                      "0px 1px 5px rgba(0,0,0,0.12), 0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px -2px rgba(0,0,0,0.2)",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  {vm.ctaText}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

