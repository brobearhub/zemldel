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
        sx={{
          fontWeight: 700,
          fontSize: 24,
          lineHeight: 1.334,
          color: "text.primary",
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
            fontSize: 14,
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
