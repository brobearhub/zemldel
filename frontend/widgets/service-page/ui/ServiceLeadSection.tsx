import LockRoundedIcon from "@mui/icons-material/LockRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { ServiceAskQuestionButton, ServiceLeadCaptureForm } from "@/features/create-service-request-lead";

type Props = {
  serviceId: string;
  serviceTitle: string;
  isAuthenticated: boolean;
  initialCustomerEmail: string | null;
};

export function ServiceLeadSection({ serviceId, serviceTitle, isAuthenticated, initialCustomerEmail }: Props) {
  return (
    <Box
      component="section"
      id="consultation"
      sx={{
        bgcolor: "#244737",
        pt: { xs: "40px", md: "113px" },
        pb: { xs: "32px", md: "113px" },
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 806px) 590px" },
            gap: { xs: 3, md: "24px" },
            alignItems: { md: "start" },
          }}
        >
          <Stack spacing={{ xs: 2, md: 3 }} sx={{ color: "common.white", pt: { md: 2 } }}>
            <Box
              sx={{
                display: "inline-flex",
                alignSelf: "flex-start",
                px: { xs: "12px", md: "14px" },
                py: { xs: "6px", md: "7px" },
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
              variant="h4"
              sx={{ color: "common.white" }}
            >
              Обсудим вашу сделку и составим план действий
            </Typography>

            <Typography sx={{ color: "#e8efea", maxWidth: 820, fontSize: { xs: 14, md: 16 }, lineHeight: { xs: 1.43, md: 1.5 } }}>
              {isAuthenticated
                ? "Просто задайте вопрос по услуге, и заявка появится в вашем профиле."
                : "Укажите электронную почту — юрист свяжется в рабочее время, уточнит задачу и назовёт точную стоимость сопровождения."}
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1.25, sm: 3 }} sx={{ color: "#e8efea" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <SpeedRoundedIcon sx={{ fontSize: { xs: 18, md: 19 }, color: "#e8efea" }} />
                <Typography variant="caption" sx={{ letterSpacing: "0.4px", color: "#e8efea" }}>
                  Ответим в течение часа
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <LockRoundedIcon sx={{ fontSize: { xs: 18, md: 19 }, color: "#e8efea" }} />
                <Typography variant="caption" sx={{ letterSpacing: "0.4px", color: "#e8efea" }}>
                  Данные защищены
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          <Paper
            elevation={0}
            sx={{
              p: { xs: "24px 16px", md: "32px" },
              bgcolor: "background.paper",
              borderRadius: { xs: 0, md: 2.5 },
            }}
          >
            <Stack spacing={2.25}>
              <Stack spacing={0.5}>
                <Typography variant="h5">{isAuthenticated ? "Задать вопрос" : "Получить консультацию"}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {isAuthenticated
                    ? `Мы создадим заявку по услуге «${serviceTitle}» и откроем чат с исполнителем.`
                    : "Укажите почту — отправим подтверждение и передадим заявку специалисту."}
                </Typography>
              </Stack>

              {isAuthenticated ? (
                <ServiceAskQuestionButton serviceId={serviceId} />
              ) : (
                <ServiceLeadCaptureForm serviceId={serviceId} initialCustomerEmail={initialCustomerEmail} />
              )}
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}

