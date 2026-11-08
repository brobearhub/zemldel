import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import {
  ServiceAskQuestionButton,
  ServiceLeadCaptureForm,
} from "@/features/create-service-request-lead";

type Props = {
  serviceId: string;
  serviceTitle: string;
  isAuthenticated: boolean;
  initialCustomerEmail: string | null;
};

export function ServiceLeadSection({
  serviceId,
  serviceTitle,
  isAuthenticated,
  initialCustomerEmail,
}: Props) {
  return (
    <Box
      component="section"
      id="consultation"
      sx={{
        bgcolor: "#244737",
        scrollMarginTop: "88px",
        pt: { xs: "40px", md: "113px" },
        pb: { xs: "32px", md: "113px" },
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "minmax(0, 1fr) minmax(0, 1fr)",
            },
            gap: { xs: 3, md: "24px" },
            alignItems: { md: "start" },
          }}
        >
          <Stack
            spacing={{ xs: 2, md: 3 }}
            sx={{ color: "common.white", pt: { md: 2 } }}
          >
            <Typography
              component="h2"
              variant="h4"
              sx={{ color: "common.white" }}
            >
              {serviceTitle}
            </Typography>
            <Typography
              sx={{
                color: "#e8efea",
                maxWidth: 820,
                fontSize: { xs: "1rem", md: "1rem" },
                lineHeight: { xs: 1.43, md: 1.5 },
              }}
            >
              {isAuthenticated
                ? "Заявка появится в вашем профиле, а чат с исполнителем откроется сразу после отправки."
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
                <Typography component="h3" variant="h5">
                  Оставить заявку
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {isAuthenticated
                    ? `Мы создадим заявку по услуге «${serviceTitle}», откроем чат с исполнителем и, если добавите вопрос, отправим его в чат сразу.`
                    : "После входа или регистрации отправим заявку исполнителю этой услуги и откроем чат. Введённые данные сохранятся."}
                </Typography>
              </Stack>

              {isAuthenticated ? (
                <ServiceAskQuestionButton
                  serviceId={serviceId}
                  serviceTitle={serviceTitle}
                />
              ) : (
                <ServiceLeadCaptureForm
                  serviceId={serviceId}
                  serviceTitle={serviceTitle}
                  initialCustomerEmail={initialCustomerEmail}
                />
              )}
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
