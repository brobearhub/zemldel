import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { LogoIcon } from "@/shared/ui/LogoIcon";

const customerSteps = [
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

const providerSteps = [
  {
    title: "Создайте профиль исполнителя",
    text: "Зарегистрируйтесь как исполнитель, выберите тип профиля и укажите свой город. Расскажите о себе или своей компании, опыте и направлениях работы.",
  },
  {
    title: "Разместите свои услуги",
    text: "Выберите категорию, опишите услугу, укажите стоимость и города или области, где вы работаете. Добавьте фотографии и опубликуйте предложение в каталоге.",
  },
  {
    title: "Обсудите заявки с клиентами",
    text: "Просматривайте подходящие заявки в кабинете и отвечайте клиентам в чате. Уточните задачу и исходные документы, согласуйте стоимость, сроки и ожидаемый результат.",
  },
  {
    title: "Ведите заказ до результата",
    text: "Зафиксируйте договорённости в договоре, ведите этапы работы и передавайте документы через площадку. После завершения заказа попросите клиента оставить отзыв.",
  },
];

const guides = {
  customer: {
    id: "how-it-works",
    title: "Для клиентов",
    actionLabel: "Стать клиентом",
    description:
      "Земледел — площадка для поиска исполнителей по земельным и кадастровым вопросам. Здесь можно найти предложение в каталоге или описать свою задачу. Состав услуги и условия работы обсуждаются с исполнителем.",
    steps: customerSteps,
  },
  provider: {
    id: "how-it-works-providers",
    title: "Для исполнителей",
    actionLabel: "Стать исполнителем",
    description:
      "Стать исполнителем на Земледеле может любой желающий: частный специалист, самозанятый, ИП или организация. Создайте профиль, расскажите о своих услугах и ведите работу с клиентами на площадке.",
    steps: providerSteps,
  },
};

type Props = {
  audience?: keyof typeof guides;
};

export function HowItWorks({ audience = "customer" }: Props) {
  const guide = guides[audience];

  return (
    <Box
      component="section"
      id={guide.id}
      aria-labelledby={`${guide.id}-title`}
      sx={{
        py: { xs: 5, md: 8 },
        bgcolor: "background.paper",
      }}
    >
      <Container>
        <Stack spacing={3}>
          <Typography
            id={`${guide.id}-title`}
            component="h2"
            variant="h4"
            aria-label={`Земледел — ${guide.title}`}
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              columnGap: 2,
              rowGap: 1,
              fontSize: { xs: 26, sm: 34 },
              fontWeight: 800,
            }}
          >
            <LogoIcon
              component="span"
              size={44}
              aria-hidden="true"
              sx={{
                flexShrink: 0,
              }}
            />
            <Box component="span">{guide.title}</Box>
          </Typography>
          <Typography sx={{ maxWidth: 800 }}>{guide.description}</Typography>
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
            {guide.steps.map((step, index) => (
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
                <Typography sx={{ lineHeight: 1.7 }}>{step.text}</Typography>
              </Box>
            ))}
          </Box>
          <Button
            href={`/signup?account=${audience}`}
            variant="contained"
            size="large"
            sx={{
              alignSelf: "flex-start",
              fontWeight: 700,
            }}
          >
            {guide.actionLabel}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
