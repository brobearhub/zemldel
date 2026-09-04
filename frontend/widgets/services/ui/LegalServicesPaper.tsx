"use client";

import {
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

const cardSx = {
  height: "100%",
  p: { xs: 2.5, md: 3 },
  borderRadius: 0.3,
  borderColor: "divider",
  bgcolor: "background.paper",
  backgroundImage:
    "linear-gradient(180deg, rgba(127,127,127,0.06) 0%, rgba(127,127,127,0.00) 65%)",
  boxShadow: "0 18px 45px rgba(0,0,0,0.06)",
  transition:
    "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 24px 65px rgba(0,0,0,0.10)",
    borderColor: "rgba(127,127,127,0.45)",
  },
} as const;

export function LegalServicesPaper() {
  const [titles, setTitles] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch services");
        return res.json();
      })
      .then((services: Array<{ category?: { slug?: string }; title: string }>) =>
        services
          .filter((s) => s.category?.slug === "legal")
          .map((s) => s.title)
      )
      .then(setTitles)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Ошибка загрузки")
      );
  }, []);

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!titles) {
    return (
      <Paper variant="outlined" sx={cardSx}>
        <Stack
          sx={{
            alignItems: "center",
            py: 4
          }}>
          <CircularProgress />
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={cardSx}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Typography
            component="h3"
            sx={{ fontWeight: 850, fontSize: 22 }}
            color="primary"
          >
            Юридические услуги
          </Typography>
          <Chip
            size="small"
            label="Юридические"
            sx={{
              fontWeight: 700,
              bgcolor: "rgba(127,127,127,0.10)",
              border: "1px solid rgba(127,127,127,0.18)",
            }}
          />
        </Stack>

        <List
          dense
          sx={{
            p: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            columnGap: { xs: 0, sm: 2 },
          }}
        >
          {titles.map((title) => (
            <ListItem
              key={title}
              disableGutters
              sx={{
                py: 0.75,
                pr: { xs: 0, sm: 1 },
                alignItems: "flex-start",
                borderTop: "1px solid",
                borderColor: "divider",
                "&:nth-of-type(-n+1)": { borderTop: "none" },
                "@media (min-width:600px)": {
                  "&:nth-of-type(-n+2)": { borderTop: "none" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 24, mt: "7px" }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "secondary.main",
                    boxShadow: "0 0 0 3px rgba(0,0,0,0.04)",
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={title}
                slotProps={{
                  primary: {
                    sx: { fontWeight: 600, lineHeight: 1.25 },
                  }
                }}
              />
            </ListItem>
          ))}
        </List>
      </Stack>
    </Paper>
  );
}
