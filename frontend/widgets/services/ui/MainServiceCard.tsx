"use client";

import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { MainServiceItem } from "@/widgets/services/model/mainServices";
import { renderHighlightedDescription } from "@/widgets/services/lib/renderHighlightedDescription";

type Props = {
  item: MainServiceItem;
};

export const MainServiceCard = ({ item }: Props) => {
  return (
    <Box
      sx={{
        position: "relative",
        // Reserve space so the icon can "pop out" above the card on hover.
        pt: 4.5,
        "@keyframes serviceIconGlowShimmer": {
          "0%": { transform: "translate(-50%, -50%) scale(0.96) rotate(0deg)" },
          "50%": {
            transform: "translate(-50%, -50%) scale(1.06) rotate(180deg)",
          },
          "100%": {
            transform: "translate(-50%, -50%) scale(0.96) rotate(360deg)",
          },
        },
        "&:hover .service-card": {
          transform: "translateY(-12px) scaleX(0.97)",
          height: { xs: 180, md: 195 },
          boxShadow: "0 28px 90px rgba(0,0,0,0.28)",
          filter: "saturate(1.06)",
        },
        "&:hover .service-icon": {
          // Lift icon so ~half is above the card
          transform: {
            xs: "translateX(-50%) translateY(-96px) scale(1.02)",
            md: "translateX(-50%) translateY(-72px) scale(1.02)",
          },
        },
        "&:hover .service-icon-glow": {
          opacity: (theme) => (theme.palette.mode === "light" ? 0.38 : 0.72),
          filter: "blur(18px) saturate(1.08)",
        },
        "&:hover .service-below-description": {
          opacity: 1,
          transform: "translateY(0px)",
        },
      }}
    >
      <Paper
        className="service-card"
        variant="outlined"
        sx={{
          height: { xs: 240, md: 260 },
          borderRadius: 2,
          overflow: "visible",
          borderColor: "divider",
          color: "text.primary",
          bgcolor: "background.paper",
          backgroundImage:
            "linear-gradient(180deg, rgba(127,127,127,0.06) 0%, rgba(127,127,127,0.00) 65%)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.06)",
          transition:
            "transform 220ms cubic-bezier(.2,.8,.2,1), height 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms cubic-bezier(.2,.8,.2,1), filter 220ms ease",
          willChange: "transform",
          transformOrigin: "center",
          position: "relative",
        }}
      >
        {item.badge ? (
          <Box
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 3,
              px: 1.5,
              py: 0.75,
              borderRadius: 999,
              color: "success.contrastText",
              fontWeight: 800,
              letterSpacing: "0.02em",
              fontSize: 13,
              lineHeight: 1,
              // bgcolor: (theme) => theme.palette.success.main,
              bgcolor: "success.main",
              border: "1px solid rgba(127,127,127,0.22)",
              boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            {item.badge}
          </Box>
        ) : null}

        <Box sx={{ position: "relative", zIndex: 1, height: "100%" }}>
          <Box
            className="service-icon"
            sx={{
              position: "absolute",
              left: "50%",
              top: { xs: 20, md: 25 },
              transform: "translateX(-50%) translateY(0)",
              transition: "transform 520ms cubic-bezier(.2,.8,.2,1)",
              pointerEvents: "none",
              willChange: "transform",
              zIndex: 2,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              className="service-icon-glow"
              sx={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: { xs: 150, md: 140 },
                height: { xs: 150, md: 140 },
                borderRadius: "50%",
                transform: "translate(-50%, -50%)",
                opacity: (theme) => (theme.palette.mode === "light" ? 0.26 : 0.52),
                filter: "blur(16px)",
                transformOrigin: "center",
                animation: "serviceIconGlowShimmer 7000ms linear infinite",
                willChange: "transform, opacity, filter",
                zIndex: 0,
                backgroundImage: (theme) => {
                  const c = theme.palette[item.paletteColor].main;
                  const isLight = theme.palette.mode === "light";
                  const a1 = isLight ? 0.24 : 0.56;
                  const a2 = isLight ? 0.16 : 0.36;
                  const a3 = isLight ? 0.08 : 0.18;
                  return [
                    `radial-gradient(circle at 30% 30%, ${alpha(c, a1)} 0%, ${alpha(c, 0.0)} 62%)`,
                    `radial-gradient(circle at 70% 75%, ${alpha(c, a2)} 0%, ${alpha(c, 0.0)} 58%)`,
                    `conic-gradient(from 180deg, ${alpha(c, 0.0)} 0deg, ${alpha(c, a3)} 70deg, ${alpha(c, 0.0)} 140deg, ${alpha(c, a3)} 230deg, ${alpha(c, 0.0)} 360deg)`,
                  ].join(", ");
                },
                "@media (prefers-reduced-motion: reduce)": {
                  animation: "none",
                },
              }}
            />
            <item.Icon
              sx={{
                fontSize: 128,
                color: (theme) => theme.palette[item.paletteColor].main,
                filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.18))",
                position: "relative",
                zIndex: 1,
              }}
            />
          </Box>

          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              px: 3,
              pb: 3,
              pt: 1.25,
              textAlign: "center",
              height: 78,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <Typography
              sx={{
                position: "relative",
                zIndex: 1,
                fontWeight: 950,
                letterSpacing: "0.15em",
                lineHeight: 1.4,
                textTransform: "uppercase",
                fontSize: { xs: 14, sm: 15, md: 18 },
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.title}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box
        sx={{
          height: 86,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          pt: 1.75,
        }}
      >
        <Typography
          className="service-below-description"
          sx={{
            maxWidth: 360,
            textAlign: "center",
            opacity: 0,
            transform: "translateY(-6px)",
            transition: "opacity 220ms ease, transform 220ms ease",
            fontSize: 14,
            lineHeight: 1.35,
            color: "text.secondary",
          }}
        >
          {renderHighlightedDescription(item)}
        </Typography>
      </Box>
    </Box>
  );
};

