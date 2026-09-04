"use client";

import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type { Theme } from "@mui/material";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { ColorModeToggle } from "@/core/theme/ColorModeToggle";
import { useColorMode } from "@/core/theme/ColorModeContext";
import { useMemo } from "react";

const BREAKPOINT_KEYS = ["xs", "sm", "md", "lg", "xl", "xxl"] as const;
type BreakpointKey = (typeof BREAKPOINT_KEYS)[number];

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

function getActiveBreakpointKey(args: {
  readonly isXs: boolean;
  readonly isSm: boolean;
  readonly isMd: boolean;
  readonly isLg: boolean;
  readonly isXl: boolean;
  readonly isXxl: boolean;
}): BreakpointKey | "unknown" {
  if (args.isXxl) return "xxl";
  if (args.isXl) return "xl";
  if (args.isLg) return "lg";
  if (args.isMd) return "md";
  if (args.isSm) return "sm";
  if (args.isXs) return "xs";
  return "unknown";
}

export default function ThemesPage() {
  const theme = useTheme();
  const { mode } = useColorMode();
  const isXs = useMediaQuery(theme.breakpoints.only("xs"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));
  const isMd = useMediaQuery(theme.breakpoints.only("md"));
  const isLg = useMediaQuery(theme.breakpoints.only("lg"));
  const isXl = useMediaQuery(theme.breakpoints.only("xl"));
  const isXxl = useMediaQuery(theme.breakpoints.only("xxl"));

  const activeBreakpointKey = getActiveBreakpointKey({
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isXxl,
  });

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 4, md: 6 } }}>
      <Container>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 2
            }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                Themes
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Текущий режим:{" "}
                <Box component="span" sx={{ fontWeight: 800 }}>
                  {mode}
                </Box>
              </Typography>
            </Box>
            <ColorModeToggle showLabel />
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
              <Stack
                direction={{ xs: "column", sm: "row" }}
                sx={{
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  gap: 1
                }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Breakpoints (theme.breakpoints.values)
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Активный брейкпоинт:{" "}
                    <Box component="span" sx={{ fontWeight: 800 }}>
                      {activeBreakpointKey}
                    </Box>
                  </Typography>
                </Box>
                <Chip
                  label={`active: ${activeBreakpointKey}`}
                  color={activeBreakpointKey === "unknown" ? "warning" : "primary"}
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 800 }}
                />
              </Stack>

              <Divider />

              <Grid container spacing={1.25}>
                {BREAKPOINT_KEYS.map((key) => {
                  const valuePx = theme.breakpoints.values[key];
                  const isActive = key === activeBreakpointKey;

                  return (
                    <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          borderColor: isActive ? "primary.main" : undefined,
                          bgcolor: isActive ? "action.hover" : undefined,
                        }}
                      >
                        <Stack spacing={0.5}>
                          <Stack
                            direction="row"
                            sx={{
                              alignItems: "center",
                              gap: 1
                            }}>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {key}
                            </Typography>
                            {isActive ? (
                              <Chip
                                label="active"
                                color="primary"
                                size="small"
                                sx={{ height: 20, fontWeight: 800 }}
                              />
                            ) : null}
                          </Stack>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {valuePx}px
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              fontFamily: "monospace",
                              wordBreak: "break-word",
                            }}
                          >
                            {theme.breakpoints.up(key)}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
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
                  <Stack direction="row" spacing={1} useFlexGap sx={{
                    flexWrap: "wrap"
                  }}>
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
                  <Stack direction="row" spacing={1} useFlexGap sx={{
                    flexWrap: "wrap"
                  }}>
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
            <ThemePaletteBlock mode="dark" />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

