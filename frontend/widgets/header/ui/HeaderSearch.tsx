"use client";

import { Box, InputBase, alpha } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

export const HeaderSearch = () => (
  <Box
    sx={{
      width: "100%",
      maxWidth: { xs: "100%", sm: 320, md: 400 },
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        borderRadius: 1.2,
        bgcolor: "common.white",
        border: (theme) =>
          `3px solid ${theme.palette.primary.light}`,
        px: 1.5,
        py: 0.75,
        "&:focus-within": {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.7),
        },
      }}
    >
      <SearchRoundedIcon
        sx={{ color: "text.secondary", mr: 1, fontSize: 22 }}
      />
      <InputBase
        placeholder="Найти услуги"
        fullWidth
        inputProps={{ "aria-label": "Поиск услуг" }}
        sx={{
          color: "text.primary",
          fontSize: { xs: "0.9375rem", sm: "1rem" },
          "& .MuiInputBase-input::placeholder": {
            opacity: 0.8,
            color: "text.secondary",
          },
        }}
      />
    </Box>
  </Box>
);
