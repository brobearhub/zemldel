import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import {
  Box,
  Button,
  Container,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import type { ServiceHeroVm } from "@/widgets/service-page/model/service-hero.vm";
import { formatReviewCount } from "@/entities/review";
import { formatRubPriceLabel } from "@/shared/lib/money/format-rub-price-label";
import { ServiceImageGallery } from "./ServiceImageGallery";
import { ServicePlaces } from "@/entities/service";
import { ServiceBackButton } from "./ServiceBackButton";

type Props = {
  vm: ServiceHeroVm;
  serviceId?: string;
};

export function ServiceHeroSection({ vm, serviceId }: Props) {
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
              {vm.imageUrl || vm.images?.length ? (
                <ServiceImageGallery
                  images={
                    vm.images?.length
                      ? vm.images
                      : vm.imageUrl
                        ? [vm.imageUrl]
                        : []
                  }
                  title={vm.title}
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

              {serviceId ? (
                <Box
                  sx={{
                    position: "absolute",
                    left: 8,
                    bottom: 8,
                    zIndex: 2,
                  }}
                >
                  <FavoriteButton
                    kind="services"
                    id={serviceId}
                  />
                </Box>
              ) : null}
              {vm.imageBadgeLabel ? (
                <Box
                  sx={{
                    position: "absolute",
                    right: { xs: "16px", md: "28px" },
                    top: { xs: "16px", md: "28px" },
                    display: "inline-flex",
                    alignItems: "center",
                    gap: { xs: "6px", md: "10px" },
                    px: { xs: "12px", md: "16px" },
                    py: { xs: "8px", md: "12px" },
                    borderRadius: "999px",
                    bgcolor: "background.paper",
                  }}
                >
                  <VerifiedUserRoundedIcon
                    sx={{ fontSize: { xs: 16, md: 20 }, color: "text.primary" }}
                  />
                  <Typography variant="caption" sx={{ letterSpacing: "0.4px" }}>
                    {vm.imageBadgeLabel}
                  </Typography>
                </Box>
              ) : null}
            </Box>

            <Box
              sx={{
                minWidth: 0,
                flex: { md: "1 1 0" },
                display: "flex",
                flexDirection: "column",
                width: "100%",
              }}
            >
              <Stack spacing={{ xs: "14px", md: "20px" }} sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignSelf: "flex-start",
                      px: { xs: "12px", md: "14px" },
                      py: { xs: "5px", md: "7px" },
                      borderRadius: "999px",
                      bgcolor: "background.paper",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.primary", letterSpacing: "0.4px" }}
                    >
                      {vm.categoryLabel}
                    </Typography>
                  </Box>

                  {vm.places.length ? (
                    <Stack
                      direction="row"
                      spacing={{ xs: "5px", md: "7px" }}
                      sx={{
                        alignItems: "flex-start",
                        minWidth: 0,
                        maxWidth: "100%",
                      }}
                    >
                      <LocationOnRoundedIcon
                        sx={{
                          fontSize: { xs: 18, md: 22 },
                          color: "text.primary",
                          mt: "2px",
                        }}
                      />
                      <ServicePlaces places={vm.places} />
                    </Stack>
                  ) : null}
                </Box>

                <Typography variant="h1" component="h1">
                  {vm.title}
                </Typography>

                {vm.description ? (
                  <Stack spacing={1}>
                    <Typography
                      component="h2"
                      variant="subtitle1"
                      sx={{ fontWeight: 700 }}
                    >
                      Описание услуги от исполнителя
                    </Typography>
                    <Typography
                      sx={{
                        color: "text.secondary",
                        fontSize: "1.125rem",
                        lineHeight: 30 / 18,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {vm.description}
                    </Typography>
                  </Stack>
                ) : null}

                {vm.rating ? (
                  <Stack
                    direction="row"
                    spacing={{ xs: "6px", md: "9px" }}
                    sx={{ alignItems: "center" }}
                  >
                    <Rating
                      value={vm.rating.value}
                      readOnly
                      precision={0.1}
                      size="small"
                      sx={{
                        "& .MuiRating-iconFilled": { color: "#ffb400" },
                      }}
                    />
                    <Typography variant="body2">
                      {vm.rating.value.toFixed(1)}
                    </Typography>
                    {vm.rating.reviewCount != null ? (
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", letterSpacing: "0.4px" }}
                      >
                        {formatReviewCount(vm.rating.reviewCount)}
                      </Typography>
                    ) : null}
                  </Stack>
                ) : null}

                {vm.benefits.length ? (
                  <Stack
                    spacing={{ xs: "8px", md: "9px" }}
                    sx={{ py: { md: "25px" }, maxWidth: { md: 322 } }}
                  >
                    {vm.benefits.map((b) => (
                      <Stack
                        key={b}
                        direction="row"
                        spacing={{ xs: "8px", md: "10px" }}
                        sx={{ alignItems: "center" }}
                      >
                        <CheckCircleRoundedIcon
                          sx={{
                            fontSize: { xs: 18, md: 20 },
                            color: "success.main",
                          }}
                        />
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
                <Stack
                  spacing={"2px"}
                  sx={{
                    whiteSpace: "normal",
                    alignSelf: {
                      xs: "flex-start",
                      sm: "center",
                      md: "flex-start",
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", letterSpacing: "0.4px" }}
                  >
                    Стоимость услуги
                  </Typography>
                  <Typography
                    variant="h4"
                    // color="textSecondary"
                    sx={{ color: "text.primary" }}
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
                    "&:hover": { bgcolor: "text.primary" },
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
