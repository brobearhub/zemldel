"use client";

import Link from "next/link";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";

export type ServiceTemplateRow = {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  paletteColor: string | null;
  icon: string | null;
};

type Props = {
  templates: ServiceTemplateRow[];
  embedded?: boolean;
};

export function ServiceTemplatesSection({ templates, embedded }: Props) {
  if (!templates.length) return null;

  const content = (
    <Stack spacing={{ xs: 2.5, md: 3 }}>
      <Stack spacing={0.75}>
        <Typography
          component="h2"
          sx={{ fontWeight: 900, letterSpacing: "-0.01em", fontSize: 28 }}
          color="primary"
        >
          Шаблонные услуги
        </Typography>
        <Typography sx={{ color: "text.secondary", maxWidth: 860 }}>
          Выберите услугу — на следующем шаге вы увидите исполнителей (провайдеров), которые её оказывают.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: { xs: 2, md: 3 },
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
          },
          alignItems: "stretch",
        }}
      >
        {templates.map((t) => (
          <Paper
            key={t.id}
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 1.5,
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <Typography sx={{ fontWeight: 800, lineHeight: 1.25 }}>{t.title}</Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.5, flex: 1 }}>
              {t.description ?? "Откройте услугу, чтобы выбрать исполнителя."}
            </Typography>
            <Button
              component={Link}
              href={`/service-templates/${t.id}`}
              variant="contained"
              sx={{ alignSelf: "flex-start", fontWeight: 800, textTransform: "none" }}
            >
              Выбрать исполнителя
            </Button>
          </Paper>
        ))}
      </Box>
    </Stack>
  );

  if (embedded) {
    return (
      <Box component="section" sx={{ py: { xs: 3, md: 4 } }}>
        {content}
      </Box>
    );
  }

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 7, md: 10 },
        bgcolor: "background.default",
      }}
    >
      <Container>
        {content}
      </Container>
    </Box>
  );
}

