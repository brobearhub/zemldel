"use client";

import { AppBar, Box, Toolbar, Typography } from "@mui/material";
import { ColorModeToggle } from "@/core/theme/ColorModeToggle";
import { HeaderLogo } from "@/widgets/header/ui/HeaderLogo";
import { ProfileMenu } from "@/widgets/header/ui/ProfileMenu";

type Props = {
  title: string;
};

export function CabinetMobileHeader({ title }: Props) {
  return (
    <AppBar position="fixed" elevation={0}>
      <Toolbar
        disableGutters
        sx={{
          px: 1.5,
          py: 0.5,
          height: 60,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          width: "100%",
          columnGap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifySelf: "start" }}>
          <HeaderLogo />
        </Box>

        <Box sx={{ minWidth: 0, display: "flex", justifyContent: "center", justifySelf: "center" }}>
          <Typography
            component="p"
            sx={{
              m: 0,
              fontWeight: 700,
              color: "text.primary",
              minHeight: 44,
              display: "flex",
              alignItems: "center",
            }}
          >
            {title}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifySelf: "end", gap: 0.25 }}>
          <ColorModeToggle />
          <ProfileMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

