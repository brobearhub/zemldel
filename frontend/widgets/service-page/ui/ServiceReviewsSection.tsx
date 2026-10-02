import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { Avatar, Box, Card, CardContent, CardHeader, Container, Rating, Stack, Typography } from "@mui/material";

type ReviewCard = {
  author: string;
  subtitle: string;
  text: string;
  initials: string;
  rating: number;
};

const REVIEWS: readonly ReviewCard[] = [
  {
    author: "Анна К.",
    subtitle: "Покупка квартиры · сентябрь 2026",
    text: "Получили понятный план действий и быстро решили нестандартный вопрос. Специалист был на связи и объяснял каждый этап.",
    initials: "АК",
    rating: 4.5,
  },
  {
    author: "Михаил П.",
    subtitle: "Продажа дома · август 2026",
    text: "Всё было организовано спокойно и последовательно: заранее знали сроки, документы и следующий шаг.",
    initials: "МП",
    rating: 4.5,
  },
  {
    author: "Елена С.",
    subtitle: "Альтернативная сделка · июль 2026",
    text: "Спасибо за внимательность и понятные рекомендации. Вопрос довели до результата без лишней бюрократии.",
    initials: "ЕС",
    rating: 4.5,
  },
];

type Props = {
  ratingValue: number;
  reviewCountLabel: string;
  cityLabel?: string | null;
};

export function ServiceReviewsSection({ ratingValue, reviewCountLabel, cityLabel = null }: Props) {
  return (
    <Box component="section" sx={{ bgcolor: "background.default", pt: { xs: "48px", md: "96px" }, pb: { xs: "48px", md: "104px" } }}>
      <Container maxWidth="xl">
        <Stack sx={{ gap: { xs: "24px", md: "50px" } }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { md: "flex-end" },
              justifyContent: "space-between",
              gap: { xs: 2, md: 4 },
            }}
          >
            <Stack spacing={1.25} sx={{ maxWidth: 760 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  px: { xs: "12px", md: "14px" },
                  py: { xs: "5px", md: "7px" },
                  borderRadius: "999px",
                  bgcolor: "#e4ece4",
                }}
              >
                <Typography variant="caption" sx={{ color: "primary.dark", letterSpacing: "0.4px" }}>
                  Отзывы
                </Typography>
              </Box>

              <Typography variant="h4" >
                Клиенты отмечают спокойствие и ясность
              </Typography>

              <Typography sx={{ color: "text.secondary", maxWidth: 820, fontSize: { xs: 14, md: 16 }, lineHeight: { xs: 1.43, md: 1.5 } }}>
                Проверенные отзывы о сопровождении сделок с недвижимостью{cityLabel ? ` в ${cityLabel}.` : "."}
              </Typography>
            </Stack>

            <Stack spacing={0.5} sx={{ alignItems: { xs: "flex-start", md: "flex-end" } }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <StarRoundedIcon sx={{ fontSize: { xs: 22, md: 25 }, color: "#ffb400" }} />
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: 32, md: 32 },
                    lineHeight: 1.235,
                    letterSpacing: "0.25px",
                  }}
                >
                  {ratingValue.toFixed(1)}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.4px" }}>
                {reviewCountLabel}
              </Typography>
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              gap: { xs: 2, md: 3 },
            }}
          >
            {REVIEWS.map((r) => (
              <Card
                key={r.author}
                elevation={0}
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: { xs: 2.5, md: 2.5 },
                }}
              >
                <CardHeader
                  avatar={<Avatar sx={{ bgcolor: "grey.400", color: "background.paper" }}>{r.initials}</Avatar>}
                  title={<Typography>{r.author}</Typography>}
                  subheader={
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {r.subtitle}
                    </Typography>
                  }
                  sx={{ px: { xs: "16px", md: "28px" }, pt: { xs: "16px", md: "28px" }, pb: 0 }}
                />
                <CardContent sx={{ px: { xs: "16px", md: "28px" }, pb: { xs: "16px", md: "28px" }, pt: { xs: 2, md: "20px" } }}>
                  <Stack spacing={{ xs: 1.5, md: 2.5 }}>
                    <Rating
                      value={r.rating}
                      readOnly
                      precision={0.5}
                      size="small"
                      sx={{ "& .MuiRating-iconFilled": { color: "#ffb400" } }}
                    />
                    <Typography sx={{ lineHeight: 1.5, fontSize: { xs: 14, md: 16 } }}>
                      {r.text}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

