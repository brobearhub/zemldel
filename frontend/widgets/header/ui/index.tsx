"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { AppBar, Box, Drawer, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import { useAppSelector } from "@/core/store/hooks";
import { SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
import { HeaderLogo } from "./HeaderLogo";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderNav } from "./HeaderNav";
import { HeaderCity } from "./HeaderCity";
import { ProfileMenu } from "./ProfileMenu";

export const Header = () => {
  const pathname = usePathname();
  const isAuthenticated = useAppSelector((state) => state.auth.status === "authenticated");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const hideHeaderCity = pathname === "/signup";
  const closeMenu = () => setMenuOpen(false);
  const closeProfile = () => setProfileOpen(false);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar
        disableGutters
        sx={{
          px: { xs: 1.5, sm: 2 },
          height: { xs: SITE_HEADER_HEIGHT_PX.xs, sm: SITE_HEADER_HEIGHT_PX.sm },
          minHeight: { xs: SITE_HEADER_HEIGHT_PX.xs, sm: SITE_HEADER_HEIGHT_PX.sm },
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "space-between", 
          width: "100%",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flex: "0 0 auto" }}>
          <HeaderLogo />
          <Box sx={{ display: { xs: "none", md: "flex" } }}>
            {hideHeaderCity ? null : <HeaderCity />}
          </Box>
        </Box>

        {/* <Box
          sx={{
            flex: "1 1 auto",
            minWidth: 0,
            display: { xs: "none", md: "flex" },
            justifyContent: "center",
            alignItems: "center",
            px: 2,
          }}
        >
          <HeaderSearch />
        </Box> */}

        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", flex: "0 0 auto" }}>
          <HeaderNav />
        </Box>

        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            gap: 0.5,
            ml: "auto",
          }}
        >
          <Suspense fallback={null}>
            <ProfileMenu onPress={() => setProfileOpen(true)} />
          </Suspense>
          <IconButton
            aria-label="Открыть меню"
            onClick={() => setMenuOpen(true)}
            sx={{ color: "inherit", minWidth: 44, minHeight: 44 }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Box>
      </Toolbar>

      <Drawer
        anchor="right"
        open={menuOpen}
        onClose={closeMenu}
        slotProps={{ paper: { sx: { width: "min(100vw, 320px)", pt: 1, pb: 3, px: 2 } } }}
      >
        <Stack spacing={1}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            {hideHeaderCity ? null : (
              <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>
                <HeaderCity showLabel />
              </Box>
            )}
            <IconButton
              aria-label="Закрыть меню"
              onClick={closeMenu}
              sx={{ color: "text.primary", flexShrink: 0, ml: "auto", minWidth: 44, minHeight: 44 }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          <HeaderNav key={menuOpen ? "open" : "closed"} showLabels onNavigate={closeMenu} />
        </Stack>
      </Drawer>

      <Drawer
        anchor="right"
        open={profileOpen}
        onClose={closeProfile}
        aria-labelledby={isAuthenticated ? undefined : "profile-drawer-title"}
        slotProps={{ paper: { sx: { width: "min(100vw, 320px)", pt: 1, pb: 3, px: 2 } } }}
      >
        <Stack spacing={1}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            {isAuthenticated ? null : (
              <Typography
                id="profile-drawer-title"
                component="h2"
                variant="subtitle1"
                sx={{ fontWeight: 600, minWidth: 0 }}
              >
                Войти
              </Typography>
            )}
            <IconButton
              aria-label="Закрыть меню"
              onClick={closeProfile}
              sx={{ color: "text.primary", flexShrink: 0, ml: "auto", minWidth: 44, minHeight: 44 }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          <Suspense fallback={null}>
            <ProfileMenu layout="sheet" onNavigate={closeProfile} />
          </Suspense>
        </Stack>
      </Drawer>
    </AppBar>
  );
};

export { HeaderCity } from "./HeaderCity";
