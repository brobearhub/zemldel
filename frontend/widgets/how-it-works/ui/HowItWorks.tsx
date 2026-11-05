import { Box, Container, Stack, Typography } from "@mui/material";

const steps = [
  {
    title: "Опишите задачу",
    text: "Выберите услугу в каталоге или создайте свою заявку. Укажите местоположение объекта и объясните, какая помощь нужна.",
  },
  {
    title: "Обсудите детали",
    text: "В чате с исполнителем уточните исходные данные, необходимые документы и состав работ. Задайте вопросы до начала сотрудничества.",
  },
  {
    title: "Согласуйте условия",
    text: "Обсудите стоимость, сроки и ожидаемый результат. Зафиксируйте договорённости в договоре перед началом работ.",
  },
  {
    title: "Проверьте результат",
    text: "Сопоставьте выполненную работу с договорённостями. После завершения заказа оставьте отзыв, чтобы поделиться своим опытом.",
  },
];

export function HowItWorks() {
  return (
    <Box
      component="section"
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      sx={{
        py: { xs: 5, md: 8 },
        bgcolor: "background.paper",
      }}
    >
      <Container>
        <Stack spacing={3}>
          <Typography
            id="how-it-works-title"
            component="h2"
            variant="h4"
            sx={{ fontWeight: 800 }}
          >
            Как пользоваться Земледелом
          </Typography>
          <Typography sx={{ maxWidth: 800 }}>
            Земледел — площадка для поиска исполнителей по земельным и кадастровым
            вопросам. Здесь можно найти предложение в каталоге или описать свою
            задачу. Состав услуги и условия работы обсуждаются с исполнителем.
          </Typography>
          <Box
            component="ol"
            sx={{
              m: 0,
              p: 0,
              listStyle: "none",
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              gap: 3,
            }}
          >
            {steps.map((step, index) => (
              <Box
                component="li"
                key={step.title}
                sx={{
                  p: { xs: 2, sm: 3 },
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Typography
                  component="h3"
                  variant="h6"
                  sx={{
                    mb: 1,
                    fontWeight: 700,
                  }}
                >
                  {index + 1}. {step.title}
                </Typography>
                <Typography sx={{ lineHeight: 1.7 }}>
                  {step.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
