import Image from "next/image";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import type { PublicProviderProfileDto } from "@/entities/provider";

type Props = {
  provider: PublicProviderProfileDto;
};

export function ServiceProviderSection({ provider }: Props) {
  return (
    <Box component="section" sx={{ bgcolor: "#a0b4a0", py: { xs: 6, md: 12 } }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "534px minmax(0, 1fr)" },
            gap: { xs: 3, md: 9 },
            alignItems: { md: "center" },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              position: "relative",
              overflow: "hidden",
              bgcolor: "action.hover",
              aspectRatio: { xs: "390 / 280", md: "534 / 506" },
            }}
          >
            {provider.image ? (
              <Image
                src={provider.image}
                alt=""
                fill
                sizes="(max-width: 900px) 100vw, 534px"
                style={{ objectFit: "cover", objectPosition: "center" }}
              />
            ) : (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.disabled",
                  fontWeight: 700,
                }}
              >
                Фото
              </Box>
            )}

            <Box
              sx={{
                position: "absolute",
                left: { xs: 16, md: 24 },
                bottom: { xs: 16, md: 24 },
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: { xs: 1.5, md: 1.75 },
                py: { xs: 1, md: 1.25 },
                borderRadius: "999px",
                bgcolor: "rgba(255,255,255,0.93)",
                color: "primary.main",
              }}
            >
              <Box sx={{ width: { xs: 8, md: 9 }, height: { xs: 8, md: 9 }, borderRadius: "50%", bgcolor: "success.main" }} />
              <Typography variant="caption" sx={{ letterSpacing: "0.4px" }}>
                {provider.availabilityLabel}
              </Typography>
            </Box>
          </Paper>

          <Stack spacing={{ xs: 2, md: 3 }} sx={{ minWidth: 0 }}>
            <Stack spacing={0.25}>
              <Typography variant="caption" sx={{ color: "primary.main", letterSpacing: "0.4px" }}>
                {provider.subtitle}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: 44, md: 60 },
                  lineHeight: 1.2,
                  letterSpacing: { md: "-0.5px" },
                  color: "common.white",
                }}
              >
                {provider.name}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: "primary.main" }}>
                {provider.subtitle}
              </Typography>
            </Stack>

            {provider.about ? (
              <Typography sx={{ color: "common.white", lineHeight: 1.5, fontSize: { xs: 14, md: 16 } }}>
                {provider.about}
              </Typography>
            ) : null}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: { xs: 2, md: 3 },
              }}
            >
              {provider.stats.slice(0, 3).map((s) => (
                <Stack
                  key={`${s.value}-${s.label}`}
                  spacing={0.5}
                  sx={{
                    pt: { xs: 1.5, md: 2.25 },
                    borderTop: "1px solid",
                    borderColor: "rgba(255,255,255,0.18)",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: 24, md: 32 },
                      lineHeight: { xs: 1.334, md: 1.235 },
                      color: "common.white",
                    }}
                  >
                    {s.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#e8efea", letterSpacing: "0.4px" }}>
                    {s.label}
                  </Typography>
                </Stack>
              ))}
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
              <Button
                variant="contained"
                sx={{
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.46px",
                  py: 1,
                  px: 3,
                  boxShadow:
                    "0px 1px 5px rgba(0,0,0,0.12), 0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px -2px rgba(0,0,0,0.2)",
                  "&:hover": { bgcolor: "grey.900" },
                }}
                component="a"
                href="#consultation"
              >
                ПОДАТЬ ЗАЯВКУ
              </Button>

              <Button
                variant="text"
                sx={{
                  color: "secondary.main",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.46px",
                }}
                component="a"
                href="#consultation"
              >
                задать вопрос
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

