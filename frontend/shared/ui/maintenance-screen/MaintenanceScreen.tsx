"use client";

import Image from "next/image";
import { Box, Button, Stack, Typography } from "@mui/material";

type Props = {
  readonly title?: string;
  readonly description?: string;
};

const DEFAULT_TITLE = "Ведутся технические работы";
const DEFAULT_DESCRIPTION =
  "Сервис временно недоступен. Мы уже занимаемся восстановлением — зайдите чуть позже.";

export function MaintenanceScreen({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: Props) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        px: 2,
        py: 6,
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(900px 600px at 50% 20%, rgb(var(--mui-palette-primary-mainChannel) / 0.14) 0%, rgb(var(--mui-palette-background-defaultChannel) / 0) 70%)",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Stack spacing={3} alignItems="center" sx={{ maxWidth: 480, textAlign: "center" }}>
        <Image
          src="/zemledel_logo_light.svg"
          alt="Земледел"
          width={140}
          height={63}
          style={{ objectFit: "contain" }}
          priority
        />
        <Stack spacing={1.5} alignItems="center">
          <Typography
            component="h1"
            variant="h4"
            color="primary"
            sx={{ fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            {title}
          </Typography>
          <Typography sx={{ color: "text.secondary", lineHeight: 1.7, fontSize: { xs: 15, md: 16 } }}>
            {description}
          </Typography>
        </Stack>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => {
            window.location.reload();
          }}
        >
          Обновить страницу
        </Button>
      </Stack>
    </Box>
  );
}
