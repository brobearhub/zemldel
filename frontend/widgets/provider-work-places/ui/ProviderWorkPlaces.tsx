import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import {
  placeKey,
  uniqueServicePlaces,
} from "@/entities/service/lib/service-places";
import type { ProviderServiceGeography } from "@/entities/provider/dto/provider-public-profile.dto";
import {
  displayCityName,
  formatRegionLabel,
} from "@/shared/lib/format-city-label";
import Link from "@/shared/ui/Link";

type Props = {
  services?: readonly ProviderServiceGeography[];
  editableProfile?: boolean;
};

export function ProviderWorkPlaces({
  services = [],
  editableProfile = false,
}: Props) {
  if (!services.length && !editableProfile) return null;

  return (
    <Paper
      component="section"
      aria-label="География работы"
      elevation={0}
      sx={{
        p: { xs: 2, md: 3 },
        minWidth: 0,
        borderRadius: 2,
      }}
    >
      <Stack spacing={2}>
        <Typography component="h2" variant="h5">
          География работы
        </Typography>
        {services.length ? (
          <Box
            component="dl"
            sx={{
              m: 0,
            }}
          >
            {services.map((service) => {
              const places = uniqueServicePlaces(service.places);
              return (
                <Box
                  key={service.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "minmax(0, 1fr)",
                      md: "minmax(0, 1fr) minmax(0, 1.2fr)",
                    },
                    alignItems: "start",
                    gap: { xs: 1, md: 3 },
                    py: 2,
                    "& + &": {
                      borderTop: "1px solid",
                      borderColor: "divider",
                    },
                    "&:first-of-type": { pt: 0 },
                    "&:last-of-type": { pb: 0 },
                  }}
                >
                  <Box
                    component="dt"
                    sx={{
                      minWidth: 0,
                      fontWeight: 600,
                    }}
                  >
                    <Link
                      href={
                        editableProfile
                          ? `/pro/services/${service.id}/edit`
                          : `/services/${service.id}`
                      }
                      sx={{
                        color: "text.primary",
                        textDecoration: "none",
                        overflowWrap: "anywhere",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {service.title}
                    </Link>
                  </Box>
                  <Box
                    component="dd"
                    sx={{
                      m: 0,
                      minWidth: 0,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    {places.length ? (
                      places.map((place) => (
                        <Chip
                          key={placeKey(place)}
                          label={
                            place.kind === "region"
                              ? formatRegionLabel(
                                  place.regionName || place.name,
                                )
                              : displayCityName(place.name)
                          }
                          sx={{
                            maxWidth: "100%",
                            height: "auto",
                            minHeight: 32,
                            bgcolor: "background.default",
                            "& .MuiChip-label": {
                              py: 0.75,
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            },
                          }}
                        />
                      ))
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                        }}
                      >
                        География не указана
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : null}
        {editableProfile ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            {services.length
              ? "География каждой опубликованной услуги. Нажмите на название, чтобы изменить её."
              : "Укажите города и регионы при публикации услуги — они появятся здесь."}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}
