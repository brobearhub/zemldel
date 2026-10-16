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
            <Typography variant="h4" sx={{ color: "common.white" }}>
              {serviceTitle}
            </Typography>
            <Typography sx={{ color: "#e8efea", maxWidth: 820, fontSize: { xs: 14, md: 16 }, lineHeight: { xs: 1.43, md: 1.5 } }}>
              {isAuthenticated
                ? "Заявка появится в вашем профиле."
                : "Укажите электронную почту, чтобы отправить заявку исполнителю."}
            </Typography>
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

