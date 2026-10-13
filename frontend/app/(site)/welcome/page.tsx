"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { RainGlassPaper } from "@/shared/ui/RainGlassPaper";
import { LogoIcon } from "@/shared/ui/LogoIcon";

export default function WelcomePage() {
  return (
    <Box
      sx={{
        flex: "1 0 auto",
        width: "100%",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: {
          xs: `${SITE_HEADER_HEIGHT_PX.xs + 16}px`,
          sm: `${SITE_HEADER_HEIGHT_PX.sm + 24}px`,
          md: 10,
        },
        backgroundImage: "url('/hero-bg-house_static_welcome.jpg?v=4')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <RainGlassPaper
        sx={{
          width: "100%",
          maxWidth: 440,
          p: 4,
        }}
      >
        <Stack spacing={3} sx={{ alignItems: "center" }}>
          <LogoIcon size={88} tone="light" priority />

          <Typography variant="h4" align="center" sx={{ fontWeight: 700 }}>
            Поздравляем!
          </Typography>

          <Stack spacing={1.5} sx={{ width: "100%" }}>
            <Button
              component={Link}
              href="/profile"
              variant="contained"
              size="large"
              fullWidth
              startIcon={<PersonRoundedIcon />}
              color="secondary"
            >
              Перейти в профиль
            </Button>
          </Stack>
        </Stack>
      </RainGlassPaper>
    </Box>
  );
}
