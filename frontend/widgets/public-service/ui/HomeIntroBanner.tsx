"use client";

import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import { Box, ButtonBase, Stack, Typography, useTheme } from "@mui/material";

type Props = { onCreateRequest: () => void };

const green = "#325E49";
const cardSx = {
  flex: 1,
  minWidth: 0,
  p: { xs: 1, md: 2 },
  border: 0,
  borderRadius: "12px",
  bgcolor: "transparent",
};
const descriptionSx = {
  mt: 1.5,
  fontSize: { xs: "1rem", md: "1rem" },
  lineHeight: 1.5,
};
const headingAttributes = {
  brand: {
    title: "земледел",
    description:
      "Земледел — сервис поиска специалистов по земельным вопросам.",
  },
  services: {
    title: "Земельные и кадастровые услуги",
    description:
      "Кадастровые и землеустроительные работы, оформление участков, подключение коммуникаций, сопровождение сделок и земельных споров.",
  },
  topics: {
    title: "ЗЕМЛЯ, УЧАСТОК, ДОКУМЕНТЫ",
    description:
      "Помощь с участком: от проверки перед покупкой до оформления документов.",
  },
  specialist: {
    title: "Найдите своего специалиста",
    description:
      "Создайте заявку, сравните отклики и согласуйте условия с исполнителем в чате.",
  },
};

export function HomeIntroBanner({ onCreateRequest }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const detailColor = isDark ? "text.primary" : green;

  return (
    <Box
      component="section"
      aria-labelledby="home-intro-title"
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        my: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: isDark ? "divider" : "#D3E0DA",
        borderRadius: "18px",
        bgcolor: isDark ? "background.secondary" : "primary.light",
        boxShadow: isDark ? "none" : "0 12px 32px -16px rgba(22, 48, 37, 0.45)",
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flex: 1,
          minWidth: 0,
          flexDirection: "column",
          justifyContent: "space-between",
          gap: { xs: 2.5, md: 4 },
          overflow: "hidden",
          px: { xs: 2.5, md: 4.5 },
          py: { xs: 3, md: 4 },
          color: isDark ? "text.primary" : "common.white",
          "&::before": {
            content: '""',
            position: "absolute",
            width: 320,
            height: 320,
            right: -96,
            bottom: -112,
            borderRadius: "50%",
            background:
              "repeating-radial-gradient(circle, transparent 0 31px, rgba(255,255,255,.14) 32px 33px)",
            pointerEvents: "none",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            width: 288,
            height: 224,
            left: -64,
            top: -80,
            borderRadius: "50%",
            background:
              "repeating-radial-gradient(ellipse, transparent 0 35px, rgba(255,255,255,.09) 36px 37px)",
            pointerEvents: "none",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            display: "grid",
            flex: 1,
            minWidth: 0,
            minHeight: {
              md: 238,
            },
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "minmax(0, 1fr) minmax(0, 1.5fr)",
            },
            gridTemplateRows: {
              xs: "auto",
              md: "1fr auto 16px auto 1fr",
            },
            gridTemplateAreas: {
              xs: '"brand" "tagline" "conditions" "topics" "services"',
              md: '"topics" "brand" "." "tagline" "services"',
              lg: '"topics topics" "brand brand" ". ." "tagline tagline" "route services"',
            },
            columnGap: {
              lg: 3,
            },
            rowGap: {
              xs: 2.5,
              md: 0,
            },
          }}
        >
          <Typography
            {...headingAttributes.brand}
            id="home-intro-title"
            component="h1"
            variant="h1"
            sx={{
              gridArea: "brand",
              maxWidth: 520,
              opacity: 0.8,
              transform: {
                md: "translateY(-22px)",
              },
              fontSize: {
                xs: "2.875rem",
                md: "3rem",
                lg: "3.625rem",
              },
              lineHeight: {
                xs: 50 / 46,
                md: 52 / 48,
                lg: 62 / 58,
              },
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            Земледел
          </Typography>
          <Typography
            {...headingAttributes.services}
            component="h2"
            variant="h2"
            sx={{
              gridArea: "services",
              alignSelf: "end",
              justifySelf: "end",
              minWidth: 0,
              fontSize: {
                xs: "1.625rem",
                md: "1.5rem",
              },
              lineHeight: {
                xs: 32 / 26,
                md: 1.5,
              },
              fontWeight: {
                xs: 700,
                md: 400,
              },
              letterSpacing: "normal",
              textAlign: "right",
            }}
          >
            Земельные и кадастровые услуги
          </Typography>
          <Typography
            {...headingAttributes.topics}
            component="h3"
            variant="h3"
            sx={{
              gridArea: "topics",
              alignSelf: "start",
              justifySelf: {
                xs: "start",
                md: "end",
              },
              maxWidth: "100%",
              pt: {
                md: 1,
              },
              fontSize: {
                xs: "1rem",
                md: "1rem",
              },
              lineHeight: {
                xs: 1.5,
                md: 1.5,
              },
              fontWeight: 700,
              letterSpacing: {
                xs: "0.5px",
                md: "1px",
              },
              textAlign: {
                xs: "left",
                md: "right",
              },
            }}
          >
            ЗЕМЛЯ • УЧАСТОК • ДОКУМЕНТЫ
          </Typography>
          <Typography
            {...headingAttributes.specialist}
            component="h4"
            variant="h4"
            sx={{
              gridArea: "tagline",
              minWidth: 0,
              transform: {
                md: "translateY(-22px)",
              },
              fontSize: {
                xs: "1.75rem",
                lg: "2.25rem",
              },
              lineHeight: {
                xs: 34 / 28,
                lg: 42 / 36,
              },
              fontWeight: 700,
              letterSpacing: "normal",
              color: isDark ? "primary.main" : "primary.dark",
            }}
          >
            Найдите своего специалиста
          </Typography>
          <Box
            aria-hidden="true"
            sx={{
              gridArea: "route",
              alignSelf: "end",
              display: {
                xs: "none",
                lg: "flex",
              },
              alignItems: "center",
              gap: 1,
              width: "100%",
              maxWidth: 320,
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                border: "2px solid white",
                borderRadius: "50%",
                flexShrink: 0,
              }}
            />
            <Box
              sx={{
                flex: 1,
                borderTop: "2px dashed rgba(255,255,255,.4)",
              }}
            />
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,.12)",
              }}
            >
              <ExploreOutlinedIcon sx={{ fontSize: 16 }} />
            </Box>
            <Box
              sx={{
                flex: 1,
                borderTop: "2px dashed rgba(255,255,255,.4)",
              }}
            />
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: isDark ? "primary.main" : "primary.dark",
                flexShrink: 0,
              }}
            />
          </Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              gridArea: "conditions",
              display: { xs: "flex", md: "none" },
              alignItems: "flex-start",
            }}
          >
            <ChatBubbleOutlineRoundedIcon
              aria-hidden="true"
              sx={{
                fontSize: 15,
                mt: "1px",
              }}
            />
            <Typography
              sx={{
                fontSize: "1rem",
                lineHeight: 1.5,
              }}
            >
              Условия и цену согласуете в чате до договора.
            </Typography>
          </Stack>
        </Box>
      </Box>
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: { xs: "100%", md: 480 },
          flexShrink: 0,
          overflow: "hidden",
          px: { xs: 2, md: 3.5 },
          py: { xs: 2.5, md: 3.5 },
          bgcolor: "background.secondary",
          color: detailColor,
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: -110,
            right: -80,
            width: 320,
            height: 260,
            borderRadius: "50%",
            background: isDark
              ? "repeating-radial-gradient(ellipse, transparent 0 31px, rgba(255,255,255,.1) 32px 33px)"
              : "repeating-radial-gradient(ellipse, transparent 0 31px, rgba(50,94,73,.1) 32px 33px)",
            pointerEvents: "none",
          }}
        />
        <Stack direction="row" spacing={1.5} sx={{ position: "relative" }}>
          <Box sx={cardSx}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 24,
                  height: 24,
                  flexShrink: 0,
                  borderRadius: "50%",
                  bgcolor: isDark ? "background.secondary" : "#DCEBE3",
                  color: isDark ? "primary.main" : green,
                }}
              >
                <FormatListBulletedRoundedIcon
                  aria-hidden="true"
                  sx={{
                    fontSize: 15,
                  }}
                />
              </Box>
              <Typography
                component="span"
                sx={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  lineHeight: 1.5,
                  color: detailColor,
                }}
              >
                Каталог услуг
              </Typography>
            </Stack>
            <Typography sx={descriptionSx}>
              Обратитесь сразу к исполнителю услуги.
            </Typography>
          </Box>
          <ButtonBase
            type="button"
            onClick={onCreateRequest}
            sx={{
              ...cardSx,
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              textAlign: "left",
              color: isDark ? "text.primary" : "#1E3A2E",
              transition: "background-color 150ms, box-shadow 150ms",
              "&:hover": {
                bgcolor: isDark ? "action.hover" : "#EEF5F1",
              },
              "&.Mui-focusVisible": {
                outline: "2px solid",
                outlineColor: isDark ? "primary.main" : green,
                outlineOffset: 3,
              },
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 24,
                  height: 24,
                  flexShrink: 0,
                  borderRadius: "50%",
                  bgcolor: isDark ? "background.secondary" : "#DCEBE3",
                  color: isDark ? "primary.main" : green,
                }}
              >
                <PlaceRoundedIcon
                  aria-hidden="true"
                  sx={{
                    fontSize: 15,
                  }}
                />
              </Box>
              <Typography
                component="span"
                sx={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  lineHeight: 1.5,
                  color: detailColor,
                }}
              >
                Своя заявка
              </Typography>
            </Stack>
            <Typography
              component="span"
              sx={{
                ...descriptionSx,
                textAlign: "left",
              }}
            >
              Сравните отклики и выберите одного исполнителя
            </Typography>
          </ButtonBase>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "flex-start",
            position: "relative",
            mt: 2,
            pt: 1.5,
            borderTop: "1px dashed",
            borderColor: isDark ? "divider" : "#B5CCD8",
          }}
        >
          <ChatBubbleOutlineRoundedIcon
            aria-hidden="true"
            sx={{
              fontSize: 15,
              mt: "1px",
              color: detailColor,
            }}
          />
          <Typography sx={{ fontSize: "1rem", lineHeight: 1.5 }}>
            Условия и цену согласуете в чате до договора.
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
