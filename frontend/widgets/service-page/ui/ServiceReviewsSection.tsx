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
};

export function ServiceReviewsSection({ ratingValue, reviewCountLabel }: Props) {
  return (
    <Box component="section" sx={{ bgcolor: "background.default", py: { xs: 6, md: 12 } }}>
      <Container maxWidth="xl">
        <Stack spacing={{ xs: 3, md: 6 }}>
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
                  px: { xs: 1.5, md: 1.75 },
                  py: { xs: 0.75, md: 0.875 },
                  borderRadius: "999px",
                  bgcolor: "#e4ece4",
                }}
              >
                <Typography variant="caption" sx={{ color: "primary.dark", letterSpacing: "0.4px" }}>
                  Отзывы
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: 44, md: 60 },
                  lineHeight: { xs: 1.167, md: 1.2 },
                  letterSpacing: { md: "-0.5px" },
                  color: "primary.main",
                }}
              >
                Клиенты отмечают спокойствие и ясность
              </Typography>

              <Typography sx={{ color: "text.secondary", maxWidth: 820 }}>
                Проверенные отзывы о сопровождении сделок с недвижимостью.
              </Typography>
            </Stack>

            <Stack spacing={0.5} sx={{ alignItems: { xs: "flex-start", md: "flex-end" } }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <StarRoundedIcon sx={{ fontSize: { xs: 22, md: 25 }, color: "#ffb400" }} />
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: 32, md: 48 },
                    lineHeight: 1.167,
                    color: "primary.main",
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
                  p: { xs: 0, md: 0 },
                }}
              >
                <CardHeader
                  avatar={<Avatar sx={{ bgcolor: "grey.400", color: "background.paper" }}>{r.initials}</Avatar>}
                  title={<Typography sx={{ color: "primary.main" }}>{r.author}</Typography>}
                  subheader={
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {r.subtitle}
                    </Typography>
                  }
                  sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 1 }}
                />
                <CardContent sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2.5, md: 3 }, pt: 0 }}>
                  <Stack spacing={1.5}>
                    <Rating
                      value={r.rating}
                      readOnly
                      precision={0.5}
                      size="small"
                      sx={{ "& .MuiRating-iconFilled": { color: "#ffb400" } }}
                    />
                    <Typography sx={{ color: "primary.main", lineHeight: 1.5 }}>
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

