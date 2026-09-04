"use client";

import { AppBar, Box, Toolbar } from "@mui/material";
import { HeaderLogo } from "./HeaderLogo";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderNav } from "./HeaderNav";
import { HeaderCity } from "./HeaderCity";

export const Header = () => {
  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar
        disableGutters
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 0.5,
          height: { xs: 60, sm: 70 },
          display: "flex",
          flexWrap: "wrap",
          gap: { xs: 1, sm: 0 },
          alignItems: "center",
          width: "100%",
        }}
      >
        <Box
          sx={{
            flex: "0 0 auto",
            minWidth: 0,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <HeaderLogo />
          <HeaderCity />
        </Box>
        <Box
          sx={{
            flex: "1 1 auto",
            minWidth: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            px: { sm: 2 },
          }}
        >
          <HeaderSearch />
        </Box>
        <Box
          sx={{
            flex: "0 0 auto",
            minWidth: 0,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 } }}>
            <HeaderNav />
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export { HeaderCity } from "./HeaderCity";
