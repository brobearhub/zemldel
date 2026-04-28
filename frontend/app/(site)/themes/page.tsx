"use client";

import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import type { Theme } from "@mui/material";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { useMemo } from "react";

type SwatchProps = {
  label: string;
  value: string;
};

const Swatch = ({ label, value }: SwatchProps) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        gap: 1.25,
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1,
          bgcolor: value,
          border: "1px solid",
          borderColor: "divider",
          flex: "0 0 auto",
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
};

function getPaletteSwatches(theme: Theme) {
  return [
    {
      title: "Primary / Secondary",
      items: [
        ["primary.main", theme.palette.primary.main],
        ["primary.light", theme.palette.primary.light],
        ["primary.dark", theme.palette.primary.dark],
        ["primary.contrastText", theme.palette.primary.contrastText],
        ["secondary.main", theme.palette.secondary.main],
        ["secondary.light", theme.palette.secondary.light],
        ["secondary.dark", theme.palette.secondary.dark],
        ["secondary.contrastText", theme.palette.secondary.contrastText],
      ],
    },
    {
      title: "Semantic",
      items: [
        ["info.main", theme.palette.info.main],
        ["success.main", theme.palette.success.main],
        ["warning.main", theme.palette.warning.main],
        ["error.main", theme.palette.error.main],
      ],
    },
    {
      title: "Background / Text / Divider",
      items: [
        ["background.default", theme.palette.background.default],
        ["background.paper", theme.palette.background.paper],
        ["text.primary", theme.palette.text.primary],
        ["text.secondary", theme.palette.text.secondary],
        ["divider", theme.palette.divider],
      ],
    },
    {
      title: "Action",
      items: [
        ["action.active", theme.palette.action.active],
        ["action.hover", theme.palette.action.hover],
        ["action.selected", theme.palette.action.selected],
        ["action.disabled", theme.palette.action.disabled],
        ["action.disabledBackground", theme.palette.action.disabledBackground],
        ["action.focus", theme.palette.action.focus],
      ],
    },
  ] as const;
}

const ThemePaletteBlock = ({ mode }: { mode: "light" | "dark" }) => {
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const groups = useMemo(() => getPaletteSwatches(theme), [theme]);

  return (
    <ThemeProvider theme={theme}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {mode.toUpperCase()} theme
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Автосгенерированные значения `theme.palette.*`
            </Typography>
          </Stack>

          <Divider />

          <Grid container spacing={2}>
            {groups.map((group) => (
              <Grid key={group.title} size={{ xs: 12, md: 6 }}>
                <Stack spacing={1.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {group.title}
                  </Typography>
                  <Grid container spacing={1.25}>
                    {group.items.map(([label, value]) => (
                      <Grid key={label} size={{ xs: 12, sm: 6 }}>
                        <Swatch label={label} value={String(value)} />
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Paper>
    </ThemeProvider>
  );
};

export default function ThemesPage() {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 4, md: 6 } }}>
      <Container>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            gap={2}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                Themes
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Текущий режим: <Box component="span" sx={{ fontWeight: 800 }}>light</Box>
              </Typography>
            </Box>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Live preview (current theme)
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                primary: {theme.palette.primary.main} • secondary: {theme.palette.secondary.main}
              </Typography>
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={1.25}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Gradients tokens (theme.custom.gradients)
              </Typography>
              <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      overflow: "hidden",
                      height: 92,
                      backgroundImage: theme.custom.gradients.sunset,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    sunset
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      overflow: "hidden",
                      height: 92,
                      bgcolor: "background.default",
                      backgroundImage: theme.custom.gradients.sky,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    sky
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      overflow: "hidden",
                      height: 92,
                      bgcolor: "background.default",
                      backgroundImage: theme.custom.gradients.glass,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    glass
                  </Typography>
                </Grid>
              </Grid>
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              overflow: "hidden",
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Buttons preview (background vs paper)
              </Typography>

              <Box
                sx={{
                  bgcolor: "background.default",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Stack spacing={1.25}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    On background.default
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="contained" color="primary">
                      Primary
                    </Button>
                    <Button variant="outlined" color="primary">
                      Primary
                    </Button>
                    <Button variant="text" color="primary">
                      Primary
                    </Button>
                    <Button variant="contained" color="secondary">
                      Secondary
                    </Button>
                    <Button variant="outlined" color="secondary">
                      Secondary
                    </Button>
                    <Button variant="text" color="secondary">
                      Secondary
                    </Button>
                    <Button variant="contained" color="info">
                      Info
                    </Button>
                    <Button variant="outlined" color="info">
                      Info
                    </Button>
                    <Button variant="contained" color="success">
                      Success
                    </Button>
                    <Button variant="outlined" color="success">
                      Success
                    </Button>
                    <Button variant="contained" color="warning">
                      Warning
                    </Button>
                    <Button variant="outlined" color="warning">
                      Warning
                    </Button>
                    <Button variant="contained" color="error">
                      Error
                    </Button>
                    <Button variant="outlined" color="error">
                      Error
                    </Button>
                    <Button variant="contained" disabled>
                      Disabled
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "background.paper",
                }}
              >
                <Stack spacing={1.25}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    On background.paper
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="contained" color="primary">
                      Primary
                    </Button>
                    <Button variant="outlined" color="primary">
                      Primary
                    </Button>
                    <Button variant="text" color="primary">
                      Primary
                    </Button>
                    <Button variant="contained" color="secondary">
                      Secondary
                    </Button>
                    <Button variant="outlined" color="secondary">
                      Secondary
                    </Button>
                    <Button variant="text" color="secondary">
                      Secondary
                    </Button>
                    <Button variant="contained" color="info">
                      Info
                    </Button>
                    <Button variant="outlined" color="info">
                      Info
                    </Button>
                    <Button variant="contained" color="success">
                      Success
                    </Button>
                    <Button variant="outlined" color="success">
                      Success
                    </Button>
                    <Button variant="contained" color="warning">
                      Warning
                    </Button>
                    <Button variant="outlined" color="warning">
                      Warning
                    </Button>
                    <Button variant="contained" color="error">
                      Error
                    </Button>
                    <Button variant="outlined" color="error">
                      Error
                    </Button>
                    <Button variant="contained" disabled>
                      Disabled
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Paper>

          <Stack spacing={2}>
            <ThemePaletteBlock mode="light" />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

