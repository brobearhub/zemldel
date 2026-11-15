"use client";

import { Box, Typography } from "@mui/material";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { useCitySelect } from "@/features/select-city";

type Props = {
  title: string;
  cityLabel?: string | null;
  inlineCity?: boolean;
};

export function ServiceSectionHeader({ title, cityLabel, inlineCity = false }: Props) {
  const { openCitySelect } = useCitySelect();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        columnGap: inlineCity ? 1.5 : 0,
        py: 1.25,
      }}
    >
      <Typography
        component="h2"
        variant="h2"
        sx={{
          fontWeight: 700,
          fontSize: { xs: "1.625rem", md: "2rem" },
          lineHeight: 1.3125,
        }}
      >
        {title}
      </Typography>

      {cityLabel ? (
        <Typography
          component="button"
          type="button"
          onClick={() => openCitySelect("customer")}
          sx={{
            fontWeight: inlineCity ? 700 : 500,
            fontSize: "1rem",
            lineHeight: 1.57,
            letterSpacing: "0.1px",
            color: inlineCity ? "text.primary" : "text.secondary",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            border: 0,
            p: 0,
            bgcolor: "transparent",
            cursor: "pointer",
            "&:hover": { color: "primary.main" },
          }}
        >
          {inlineCity ? (
            <LocationOnOutlinedIcon
              aria-hidden="true"
              sx={{
                fontSize: 18,
                color: "text.primary",
                transform: "translateY(-2px)",
              }}
            />
          ) : null}
          {cityLabel}
        </Typography>
      ) : null}
    </Box>
  );
}
