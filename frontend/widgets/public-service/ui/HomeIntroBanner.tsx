"use client";

import { Box, Button, Stack, Typography } from "@mui/material";

type Props = {
  onCreateRequest: () => void;
};

// Selected banner composition, using the site's primary palette.
const colors = {
  text: "common.white",
  muted: "common.white",
  buttonBackground: "common.white",
  buttonText: "#325E49",
};

export function HomeIntroBanner({ onCreateRequest }: Props) {
  return (
    <Box
      component="section"
      aria-labelledby="home-intro-title"
      sx={{
        my: 2,
        p: { xs: "18px", md: "28px" },
        borderRadius: "18px",
        bgcolor: "primary.main",
        color: colors.text,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "flex-start",
          gap: { xs: 2, md: 5 },
        }}
      >
        <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{ fontSize: 11, lineHeight: "15px", fontWeight: 800, letterSpacing: "1.5px", color: colors.muted, opacity: 0.75 }}
          >
            ЗЕМЛЯ • ДОМ • ДОКУМЕНТЫ
          </Typography>
          <Typography
            id="home-intro-title"
            component="h2"
            sx={{
              fontSize: { xs: 26, md: 38 },
              lineHeight: { xs: "29px", md: "43px" },
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            Земельный вопрос?
            <br />
            Найдём, с кем его решить.
          </Typography>
        </Stack>

        <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
          <Stack direction="row" spacing={1}>
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0, alignItems: "center" }}>
              <Button
                component="a"
                href="#home-services"
                variant="contained"
                fullWidth
                sx={{
                  minHeight: 44,
                  px: 1,
                  borderRadius: "8px",
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: "20px",
                  letterSpacing: 0,
                  boxShadow: "none",
                  color: colors.buttonText,
                  bgcolor: colors.buttonBackground,
                  "&:hover": { bgcolor: "#E7EDE4", boxShadow: "none" },
                  "&.Mui-focusVisible": { outline: "2px solid", outlineColor: colors.text, outlineOffset: 3 },
                }}
              >
                Каталог услуг
              </Button>
              <Typography
                align="center"
                sx={{ fontSize: { xs: 13, md: 14 }, lineHeight: { xs: "18px", md: "19px" }, opacity: 0.96 }}
              >
                Обратитесь сразу к исполнителю услуги.
              </Typography>
            </Stack>

            <Stack spacing={1} sx={{ flex: 1, minWidth: 0, alignItems: "center" }}>
              <Button
                type="button"
                variant="outlined"
                fullWidth
                onClick={onCreateRequest}
                sx={{
                  minHeight: 44,
                  px: 1,
                  borderRadius: "8px",
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: "20px",
                  letterSpacing: 0,
                  boxShadow: "none",
                  color: colors.text,
                  borderColor: colors.muted,
                  "&:hover": { borderColor: colors.text, bgcolor: "action.hover" },
                  "&.Mui-focusVisible": { outline: "2px solid", outlineColor: colors.text, outlineOffset: 3 },
                }}
              >
                Своя заявка
              </Button>
              <Typography
                align="center"
                sx={{ fontSize: { xs: 13, md: 14 }, lineHeight: { xs: "18px", md: "19px" }, opacity: 0.96 }}
              >
                Сравните отклики и выберите одного исполнителя
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Typography sx={{ mt: 2, fontSize: 13, lineHeight: "18px", color: colors.muted, opacity: 0.75 }}>
        Условия и цену согласуете в чате до договора.
      </Typography>
    </Box>
  );
}
