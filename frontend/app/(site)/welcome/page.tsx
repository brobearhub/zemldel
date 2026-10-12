"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import { RainGlassPaper } from "@/shared/ui/RainGlassPaper";
import { LogoIcon } from "@/shared/ui/LogoIcon";

export default function WelcomePage() {
  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        display: "flex",
        alignItems: { xs: "flex-start", md: "center" },
        justifyContent: "center",
        px: 2,
        pt: {
          xs: `${SITE_HEADER_HEIGHT_PX.xs + 16}px`,
          sm: `${SITE_HEADER_HEIGHT_PX.sm + 24}px`,
          md: 10,
        },
        pb: { xs: 4, sm: 6, md: 10 },
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

          <Divider sx={{ width: "100%", borderColor: "common.white", opacity: 0.28 }} />

          <Stack spacing={1.5} sx={{ width: "100%" }}>
            <Typography variant="body2" align="center" sx={{ opacity: 0.9 }}>
              Создайте профессиональный профиль, чтобы предлагать услуги и работать от имени компании в отдельном кабинете.
            </Typography>
            <Button
              component={Link}
              href="/providers/new"
              variant="outlined"
              size="medium"
              fullWidth
              startIcon={<BusinessCenterRoundedIcon />}
              color="primary"
              sx={{
                
                "&&": {
                  color: "primary.main",
                  borderColor: "primary.main",
                },
              }}
            >
              Стать исполнителем
            </Button>
            <Typography variant="caption" align="center" sx={{ opacity: 0.75 }}>
              Самозанятый, ИП или организация
            </Typography>
          </Stack>
        </Stack>
      </RainGlassPaper>
    </Box>
  );
}
