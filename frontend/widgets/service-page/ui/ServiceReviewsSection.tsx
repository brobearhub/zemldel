import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { Avatar, Box, Card, CardContent, CardHeader, Container, Rating, Stack, Typography } from "@mui/material";
import { formatReviewCountGenitive, type ReviewDto } from "@/entities/review";

type Props = {
  ratingValue: number | null;
  reviewCount: number;
  reviews: ReviewDto[];
  cityLabel?: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date);
}

export function ServiceReviewsSection({ ratingValue, reviewCount, reviews, cityLabel = null }: Props) {
  const countLabel = reviewCount > 0 ? `на основании ${formatReviewCountGenitive(reviewCount)}` : "отзывов пока нет";

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
              <Typography variant="h4">Отзывы клиентов</Typography>
              <Typography sx={{ color: "text.secondary", maxWidth: 820, fontSize: { xs: 14, md: 16 }, lineHeight: { xs: 1.43, md: 1.5 } }}>
                Оценки после завершённых заказов{cityLabel ? ` в ${cityLabel}.` : "."}
              </Typography>
            </Stack>
            {ratingValue != null ? (
              <Stack spacing={0.5} sx={{ alignItems: { xs: "flex-start", md: "flex-end" } }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <StarRoundedIcon sx={{ fontSize: { xs: 22, md: 25 }, color: "#ffb400" }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 32, lineHeight: 1.235, letterSpacing: "0.25px" }}>
                    {ratingValue.toFixed(1)}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.4px" }}>
                  {countLabel}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {countLabel}
              </Typography>
            )}
          </Box>

          {reviews.length === 0 ? (
            <Typography sx={{ color: "text.secondary" }}>Пока нет отзывов по этой услуге.</Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                gap: { xs: 2, md: 3 },
              }}
            >
              {reviews.map((review) => (
                <Card key={review.id} elevation={0} sx={{ bgcolor: "background.paper", borderRadius: 2.5 }}>
                  <CardHeader
                    avatar={<Avatar sx={{ bgcolor: "grey.400", color: "background.paper" }}>{initials(review.authorDisplayName)}</Avatar>}
                    title={<Typography>{review.authorDisplayName}</Typography>}
                    subheader={
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {formatDate(review.createdAt)}
                      </Typography>
                    }
                    sx={{ px: { xs: "16px", md: "28px" }, pt: { xs: "16px", md: "28px" }, pb: 0 }}
                  />
                  <CardContent sx={{ px: { xs: "16px", md: "28px" }, pb: { xs: "16px", md: "28px" }, pt: { xs: 2, md: "20px" } }}>
                    <Stack spacing={{ xs: 1.5, md: 2.5 }}>
                      <Rating value={review.rating} readOnly size="small" sx={{ "& .MuiRating-iconFilled": { color: "#ffb400" } }} />
                      {review.text ? (
                        <Typography sx={{ lineHeight: 1.5, fontSize: { xs: 14, md: 16 } }}>{review.text}</Typography>
                      ) : null}
                      {review.replyText ? (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          Ответ исполнителя: {review.replyText}
                        </Typography>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
