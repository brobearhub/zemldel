"use client";

import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { achievements } from "@/widgets/achievements/model/achievements";
import Link from "@/shared/ui/Link";

export const Achievements = () => {
  return (
    <Box
      component="section"
      id="achievements"
      sx={{
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            md: "repeat(5, 1fr)",
          },
          gridTemplateRows: "auto",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? alpha(theme.palette.background.paper, 0.5)
              : alpha(theme.palette.background.paper, 0.8),
          overflow: "hidden",
        }}
      >
        {/* Заголовок — три центральные ячейки первого ряда */}
        <Box
          sx={{
            gridColumn: { xs: "1 / -1", md: "2 / 5" },
            gridRow: "1",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            alignItems: "center",
            justifyContent: "center",
            px: 2,
            py: { xs: 3, md: 5 },
          }}
        >
          <Typography
            component="h2"
            variant="h2"
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.02em",
              fontSize: { xs: "1.625rem", sm: "1.875rem", md: "2.125rem" },
              lineHeight: 1.1,
              textAlign: "center",
              color: "text.primary",
            }}
          >
            Опыт исполнителя
          </Typography>
          <Link
            href="/providers/valeriya-usova"
            sx={{
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            Валерия — профиль исполнителя
          </Link>
          <Typography variant="body2" sx={{ textAlign: "center" }}>
            Показатели предоставлены исполнителем и относятся к его практике, а
            не к результатам площадки Земледел.
          </Typography>
        </Box>

        {/* 6 квадратов — достижения в центральных ячейках (колонки 2–4, ряды 2–3) */}
        {achievements.map((item, index) => {
          const col = (index % 3) + 2;
          const row = Math.floor(index / 3) + 2;
          return (
            <Box
              key={item.label}
              sx={{
                gridColumn: { xs: "auto", md: col },
                gridRow: { xs: "auto", md: row },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                p: 2,
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.25rem", sm: "1.875rem" },
                  lineHeight: 1.2,
                  color: "primary.main",
                  letterSpacing: "-0.02em",
                  mb: 1.5,
                }}
              >
                {item.value}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? alpha(theme.palette.primary.main, 0.12)
                      : alpha(theme.palette.primary.main, 0.08),
                  color: "primary.main",
                  mb: 1.5,
                }}
              >
                <item.Icon sx={{ fontSize: 24 }} />
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: "1rem", sm: "1rem" },
                  fontWeight: 300,
                  color: "text.secondary",
                  lineHeight: 1.5,
                }}
              >
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
