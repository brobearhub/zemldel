"use client";

import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { achievements } from "@/widgets/achievements/model/achievements";

const borderColorSx = (theme: { palette: { mode: string; common: { white: string; black: string } } }) =>
  theme.palette.mode === "dark"
    ? alpha(theme.palette.common.white, 0.2)
    : alpha(theme.palette.common.black, 0.14);

export const Achievements = () => {
  return (
    <Box
      component="section"
      id="achievements"
      sx={{
        // py: { xs: 5, md: 7 },
        bgcolor: "background.default",
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          width: "100%",
          aspectRatio: "5 / 3",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gridTemplateRows: "1fr 1fr 1fr",
          border: "1px solid",
          borderColor: (theme) => borderColorSx(theme),
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? alpha(theme.palette.background.paper, 0.5)
              : alpha(theme.palette.background.paper, 0.8),
          overflow: "hidden",
        }}
      >
        {/* Пустые ячейки по бокам (для линий сетки) */}
        {[1, 2, 3].flatMap((row) =>
          [1, 5].map((col) => {
            const isLastCol = col === 5;
            const isLastRow = row === 3;
            return (
              <Box
                key={`empty-${row}-${col}`}
                sx={{
                  gridColumn: col,
                  gridRow: row,
                  borderRight: isLastCol ? "none" : "1px solid",
                  borderBottom: isLastRow ? "none" : "1px solid",
                  borderLeft: "none",
                  borderTop: "none",
                  borderColor: (theme) => borderColorSx(theme),
                }}
              />
            );
          }),
        )}

        {/* Заголовок — три центральные ячейки первого ряда */}
        <Box
          sx={{
            gridColumn: "2 / 5",
            gridRow: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 2,
            borderRight: "1px solid",
            borderBottom: "1px solid",
            borderColor: (theme) => borderColorSx(theme),
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontWeight: 900,
              letterSpacing: "-0.02em",
              fontSize: { xs: 26, sm: 30, md: 34 },
              lineHeight: 1.1,
              textAlign: "center",
              color: "text.primary",
            }}
          >
            Наши достижения
          </Typography>
        </Box>

        {/* 6 квадратов — достижения в центральных ячейках (колонки 2–4, ряды 2–3) */}
        {achievements.map((item, index) => {
          const col = (index % 3) + 2;
          const row = Math.floor(index / 3) + 2;
          const isLastCol = col === 4;
          const isLastRow = row === 3;
          return (
          <Box
            key={item.label}
            sx={{
              gridColumn: col,
              gridRow: row,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              p: 2,
              borderRight: "1px solid",
              borderBottom: isLastRow ? "none" : "1px solid",
              borderColor: (theme) => borderColorSx(theme),
            }}
          >
            <Typography
              component="span"
              sx={{
                fontWeight: 800,
                fontSize: { xs: 20, sm: 30 },
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
                borderRadius: 1.5,
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
                fontSize: { xs: 13, sm: 16 },
                fontWeight: 300,
                color: "text.secondary",
                lineHeight: 1.25,
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
}
