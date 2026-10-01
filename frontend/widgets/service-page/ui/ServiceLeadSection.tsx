import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { ServiceLeadCaptureForm } from "@/features/create-service-request-lead";

type Props = {
  serviceId: string;
  isAuthenticated: boolean;
  initialCustomerEmail: string | null;
};

export function ServiceLeadSection({ serviceId, isAuthenticated, initialCustomerEmail }: Props) {
  return (
    <Box component="section" id="consultation" sx={{ bgcolor: "#244737", py: { xs: 5, md: 10 } }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 806px) 590px" },
            gap: { xs: 3, md: 6 },
            alignItems: { md: "start" },
          }}
        >
          <Stack spacing={{ xs: 2, md: 3 }} sx={{ color: "common.white", pt: { md: 2 } }}>
            <Box
              sx={{
                display: "inline-flex",
                alignSelf: "flex-start",
                px: { xs: 1.5, md: 1.75 },
                py: { xs: 0.75, md: 0.875 },
                borderRadius: "999px",
                bgcolor: "rgba(255,255,255,0.09)",
                color: "#e8efea",
              }}
            >
              <Typography variant="caption" sx={{ letterSpacing: "0.4px" }}>
                Первая консультация бесплатно
              </Typography>
            </Box>

            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: 40, sm: 48, md: 60 },
                lineHeight: { xs: 1.167, md: 1.2 },
                letterSpacing: { md: "-0.5px" },
              }}
            >
              Обсудим вашу сделку и составим план действий
            </Typography>

            <Typography sx={{ color: "#e8efea", maxWidth: 820, lineHeight: { xs: 1.43, md: 1.5 } }}>
              Укажите электронную почту — юрист свяжется в рабочее время, уточнит задачу и назовёт точную стоимость
              сопровождения.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1.25, sm: 3 }} sx={{ color: "#e8efea" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <AccessTimeRoundedIcon sx={{ fontSize: 19, color: "#e8efea" }} />
                <Typography variant="caption" sx={{ letterSpacing: "0.4px", color: "#e8efea" }}>
                  Ответим в течение часа
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <LockRoundedIcon sx={{ fontSize: 19, color: "#e8efea" }} />
                <Typography variant="caption" sx={{ letterSpacing: "0.4px", color: "#e8efea" }}>
                  Данные защищены
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 4 },
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={2.25}>
              <Stack spacing={0.5}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: 28, md: 32 },
                    lineHeight: 1.235,
                    color: "primary.main",
                  }}
                >
                  Получить консультацию
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Укажите почту — отправим подтверждение и передадим заявку специалисту.
                </Typography>
              </Stack>

              <ServiceLeadCaptureForm
                serviceId={serviceId}
                isAuthenticated={isAuthenticated}
                initialCustomerEmail={initialCustomerEmail}
              />
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}

