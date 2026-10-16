"use client";

import { AppBar, Box, Toolbar } from "@mui/material";
import { ColorModeToggle } from "@/core/theme/ColorModeToggle";
import { HeaderCity } from "@/widgets/header/ui/HeaderCity";
import { HeaderLogo } from "@/widgets/header/ui/HeaderLogo";
import { ProfileMenu } from "@/widgets/header/ui/ProfileMenu";

type Props = {
  showProviderCity?: boolean;
};

export function CabinetMobileHeader({ showProviderCity = false }: Props) {
  return (
    <AppBar position="fixed" elevation={0}>
      <Toolbar
        disableGutters
        sx={{
          px: 1.5,
          py: 0.5,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1 }}>
          <HeaderLogo />
          {showProviderCity ? (
            <Box sx={{ minWidth: 0, overflow: "hidden" }}>
              <HeaderCity showLabel scope="provider" />
            </Box>
          ) : null}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          <ColorModeToggle />
          <ProfileMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

