"use client";

import { Box, Typography } from "@mui/material";
import { useCitySelect } from "@/features/select-city";

type Props = {
  title: string;
  cityLabel?: string | null;
};

export function ServiceSectionHeader({ title, cityLabel }: Props) {
  const { openCitySelect } = useCitySelect();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
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
            fontWeight: 500,
            fontSize: "1rem",
            lineHeight: 1.57,
            letterSpacing: "0.1px",
            color: "text.secondary",
            border: 0,
            p: 0,
            bgcolor: "transparent",
            cursor: "pointer",
            "&:hover": { color: "primary.main" },
          }}
        >
          {cityLabel}
        </Typography>
      ) : null}
    </Box>
  );
}
