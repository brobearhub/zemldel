import type { Metadata } from "next";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { siteIconUrl } from "@/shared/config/site-icons";

export const metadata: Metadata = {
  title: "Иконки сайта — администрирование Земледел",
};

const browserSamples = [
  { size: 16, filename: "favicon-16x16.png" },
  { size: 32, filename: "favicon-32x32.png" },
  { size: 48, filename: "favicon-48x48.png" },
  { size: 96, filename: "favicon.svg" },
] as const;

const deviceSamples = [
  {
    label: "Apple · 180 × 180",
    filename: "apple-touch-icon.png",
    borderRadius: "26%",
  },
  {
    label: "Android · 192 / 512",
    filename: "android-chrome-192x192.png",
    borderRadius: 0,
  },
  {
    label: "Maskable · круг",
    filename: "maskable-icon-512x512.png",
    borderRadius: "50%",
  },
  {
    label: "Maskable · скругление",
    filename: "maskable-icon-512x512.png",
    borderRadius: "26%",
  },
] as const;

export default function AdminFaviconPage() {
  return (
    <Stack
      component="main"
      spacing={3}
      sx={{
        minWidth: 0,
      }}
    >
      <Stack spacing={1}>
        <Typography
          component="h1"
          variant="h1"
        >
          Земледел · Favicon
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
          }}
        >
          Только чемоданчик из Figma. Форматы браузера и системные маски.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "repeat(2, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        {[
          { title: "Светлый фон", background: "#ffffff", color: "#30342f" },
          { title: "Тёмный фон", background: "#232923", color: "#ffffff" },
        ].map(({ title, background, color }) => (
          <Paper
            key={title}
            component="section"
            elevation={0}
            sx={{
              p: {
                xs: 2,
                sm: 3,
              },
              minWidth: 0,
              borderRadius: 3,
              bgcolor: background,
              color,
              backgroundImage: "none",
            }}
          >
            <Typography
              component="h2"
              variant="h3"
              sx={{
                mb: 3,
              }}
            >
              {title}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(40px, 1fr)) 96px",
                alignItems: "center",
                gap: 1,
                minHeight: 150,
              }}
            >
              {browserSamples.map(({ size, filename }) => (
                <Box
                  key={size}
                  component="figure"
                  sx={{
                    m: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box
                    component="img"
                    src={siteIconUrl(filename)}
                    alt=""
                    width={size}
                    height={size}
                    sx={{
                      display: "block",
                    }}
                  />
                  <Typography
                    component="figcaption"
                    variant="body2"
                    sx={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    {size} px
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>

      <Paper
        component="section"
        elevation={0}
        sx={{
          p: {
            xs: 2,
            sm: 3,
          },
          borderRadius: 3,
          bgcolor: "#ffffff",
          color: "#30342f",
          backgroundImage: "none",
        }}
      >
        <Typography
          component="h2"
          variant="h3"
          sx={{
            mb: 3,
          }}
        >
          Иконки устройств
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: 3,
            py: 2,
          }}
        >
          {deviceSamples.map(({ label, filename, borderRadius }) => (
            <Box
              key={label}
              component="figure"
              sx={{
                m: 0,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                component="img"
                src={siteIconUrl(filename)}
                alt=""
                width={140}
                height={140}
                sx={{
                  display: "block",
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius,
                }}
              />
              <Typography
                component="figcaption"
                variant="body2"
                sx={{
                  textAlign: "center",
                }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Stack>
  );
}
