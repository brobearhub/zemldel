"use client";

import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";

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
  fontSize: { xs: 13, md: 14 },
  lineHeight: { xs: "18px", md: "19px" },
};

export function HomeIntroBanner({ onCreateRequest }: Props) {
  return (
    <Box
      component="section"
      aria-labelledby="home-intro-title"
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        my: 2,
        overflow: "hidden",
        border: "1px solid #D3E0DA",
        borderRadius: "18px",
        bgcolor: "primary.main",
        boxShadow: "0 12px 32px -16px rgba(22, 48, 37, 0.45)",
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
          color: "#fff",
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
        <Box sx={{ position: "relative" }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              width: "fit-content",
              ml: "auto",
              px: 1.5,
              py: 0.5,
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                lineHeight: "15px",
                fontWeight: 800,
                letterSpacing: "1.5px",
              }}
            >
              ЗЕМЛЯ • ДОМ • ДОКУМЕНТЫ
            </Typography>
          </Stack>
          <Typography
            id="home-intro-title"
            component="h2"
            sx={{
              mt: 1.5,
              fontSize: { xs: 26, md: 38 },
              lineHeight: { xs: "30px", md: "43px" },
              fontWeight: 700,
            }}
          >
            Земельный вопрос?
            <Box component="span" sx={{ display: "block", color: "#CFE6F2" }}>
              Найдём, с кем его решить.
            </Box>
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              display: { xs: "flex", md: "none" },
              alignItems: "flex-start",
              mt: 2,
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
                fontSize: 13,
                lineHeight: "18px",
              }}
            >
              Условия и цену согласуете в чате до договора.
            </Typography>
          </Stack>
        </Box>
        <Box
          aria-hidden="true"
          sx={{
            position: "relative",
            display: { xs: "none", md: "flex" },
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
          <Box sx={{ flex: 1, borderTop: "2px dashed rgba(255,255,255,.4)" }} />
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
          <Box sx={{ flex: 1, borderTop: "2px dashed rgba(255,255,255,.4)" }} />
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: "primary.dark",
              flexShrink: 0,
            }}
          />
        </Box>
      </Box>
      <Box
        sx={{
          position: "relative",
          width: { xs: "100%", md: 480 },
          flexShrink: 0,
          overflow: "hidden",
          px: { xs: 2, md: 3.5 },
          py: { xs: 2.5, md: 3.5 },
          bgcolor: "background.default",
          color: "text.primary",
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
            background:
              "repeating-radial-gradient(ellipse, transparent 0 31px, rgba(50,94,73,.1) 32px 33px)",
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
                  bgcolor: "#DCEBE3",
                  color: green,
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
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: "20px",
                  color: green,
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
              color: "#1E3A2E",
              transition: "background-color 150ms, box-shadow 150ms",
              "&:hover": {
                bgcolor: "#EEF5F1",
              },
              "&.Mui-focusVisible": {
                outline: `2px solid ${green}`,
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
                  bgcolor: "#DCEBE3",
                  color: green,
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
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: "20px",
                  color: green,
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
            borderTop: "1px dashed #B5CCD8",
          }}
        >
          <ChatBubbleOutlineRoundedIcon
            aria-hidden="true"
            sx={{ fontSize: 15, mt: "1px", color: green }}
          />
          <Typography sx={{ fontSize: 13, lineHeight: "18px" }}>
            Условия и цену согласуете в чате до договора.
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
