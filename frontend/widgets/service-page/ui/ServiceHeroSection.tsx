import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import { Box, Button, Container, Rating, Stack, Typography } from "@mui/material";
import type { ServiceHeroVm } from "@/widgets/service-page/model/service-hero.vm";
import { formatReviewCount } from "@/entities/review";
import { formatRubPriceLabel } from "@/shared/lib/money/format-rub-price-label";
import { CdnFillImage } from "@/shared/ui/cdn-image";
import { ServiceBackButton } from "./ServiceBackButton";

type Props = {
  vm: ServiceHeroVm;
};

export function ServiceHeroSection({ vm }: Props) {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: "background.default",
        // Верхний зазор даёт общий spacer под fixed header (см. `SiteChrome`).
        pt: 0,
        pb: { xs: "32px", md: "82px" },
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={{ xs: "20px", md: "28px" }}>
          <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <ServiceBackButton />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: "20px", md: "64px" },
              alignItems: { xs: "start", md: "stretch" },
            }}
          >
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                bgcolor: "action.hover",
                width: "100%",
                flexGrow: { md: 0 },
                flexShrink: { md: 1 },
                flexBasis: { md: "clamp(320px, 42vw, 600px)" },
                alignSelf: { md: "flex-start" },
                height: { xs: 220, md: "auto" },
                aspectRatio: { md: "600 / 522" },
                maxHeight: { md: 522 },
                borderRadius: 1,
              }}
            >
              {vm.imageUrl ? (
                <CdnFillImage
                  src={vm.imageUrl}
                  sizes="(max-width: 900px) 100vw, 600px"
                  unoptimized={process.env.NODE_ENV !== "production"}
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
                    left: { xs: "16px", md: "28px" },
                    bottom: { xs: "16px", md: "28px" },
                    display: "inline-flex",
                    alignItems: "center",
                    gap: { xs: "6px", md: "10px" },
                    px: { xs: "12px", md: "16px" },
                    py: { xs: "8px", md: "12px" },
                    borderRadius: "999px",
                    bgcolor: "rgba(255,255,255,0.95)",
                  }}
                >
                  <VerifiedUserRoundedIcon sx={{ fontSize: { xs: 16, md: 20 }, color: "text.primary" }} />
                  <Typography variant="caption" sx={{ letterSpacing: "0.4px" }}>
                    {vm.imageBadgeLabel}
                  </Typography>
                </Box>
              ) : null}
            </Box>

            <Box sx={{ minWidth: 0, flex: { md: "1 1 0" }, display: "flex", flexDirection: "column", width: "100%" }}>
              <Stack spacing={{ xs: "14px", md: "20px" }} sx={{ minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignSelf: "flex-start",
                      px: { xs: "12px", md: "14px" },
                      py: { xs: "5px", md: "7px" },
                      borderRadius: "999px",
                      bgcolor: "#e4ece4",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "primary.dark", letterSpacing: "0.4px" }}>
                      {vm.categoryLabel}
                    </Typography>
                  </Box>

                  {vm.cityLabel ? (
                    <Stack direction="row" spacing={{ xs: "5px", md: "7px" }} sx={{ alignItems: "center" }}>
                      <LocationOnRoundedIcon sx={{ fontSize: { xs: 18, md: 22 }, color: "text.primary" }} />
                      <Typography variant="body2">{vm.cityLabel}</Typography>
                    </Stack>
                  ) : null}
                </Box>

                <Typography variant="h4" >
                  {vm.title}
                </Typography>

                {vm.description ? (
                  <Typography sx={{ color: "text.secondary", fontSize: { xs: 14, md: 16 }, lineHeight: { xs: 1.43, md: 1.5 } }}>
                    {vm.description}
                  </Typography>
                ) : null}

                {vm.rating ? (
                  <Stack direction="row" spacing={{ xs: "6px", md: "9px" }} sx={{ alignItems: "center" }}>
                    <Rating
                      value={vm.rating.value}
                      readOnly
                      precision={0.1}
                      size="small"
                      sx={{
                        "& .MuiRating-iconFilled": { color: "#ffb400" },
                      }}
                    />
                    <Typography variant="body2">{vm.rating.value.toFixed(1)}</Typography>
                    {vm.rating.reviewCount != null ? (
                      <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.4px" }}>
                        {formatReviewCount(vm.rating.reviewCount)}
                      </Typography>
                    ) : null}
                  </Stack>
                ) : null}

                {vm.benefits.length ? (
                  <Stack spacing={{ xs: "8px", md: "9px" }} sx={{ py: { md: "25px" }, maxWidth: { md: 322 } }}>
                    {vm.benefits.map((b) => (
                      <Stack key={b} direction="row" spacing={{ xs: "8px", md: "10px" }} sx={{ alignItems: "center" }}>
                        <CheckCircleRoundedIcon sx={{ fontSize: { xs: 18, md: 20 }, color: "success.main" }} />
                        <Typography variant="body2">{b}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                ) : null}
              </Stack>

              <Box
                sx={{
                  mt: { md: "auto" },
                  display: "flex",
                  justifyContent: { xs: "flex-start", lg: "space-between" },
                  alignItems: { xs: "stretch", lg: "flex-end" },
                  gap: 2,
                  flexDirection: { xs: "column", lg: "row" },
                }}
              >
                <Stack spacing={"2px"} sx={{ whiteSpace: "nowrap", alignSelf: { xs: "flex-start", sm: "center", md: "flex-start" } }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.4px" }}>
                    Стоимость услуги
                  </Typography>
                  <Typography
                    variant="h4" 
                    // color="textSecondary"
                    sx={{ color: "#745448" }}
                  >
                    {formatRubPriceLabel(vm.priceLabel)}
                  </Typography>
                </Stack>

                <Button
                  component="a"
                  href={vm.ctaAnchorHref}
                  variant="contained"
                  sx={{
                    px: "22px",
                    py: "8px",
                    fontWeight: 600,
                    letterSpacing: "0.46px",
                    textTransform: "uppercase",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    minWidth: { xs: "100%", sm: "auto" },
                    boxShadow:
                      "0px 1px 5px rgba(0,0,0,0.12), 0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px -2px rgba(0,0,0,0.2)",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  {vm.ctaText}
                </Button>
              </Box>
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

