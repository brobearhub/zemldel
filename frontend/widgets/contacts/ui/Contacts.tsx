"use client";

import { useState } from "react";
import Image from "next/image";
import { Box, SvgIcon, Stack, Typography } from "@mui/material";
import TelegramIcon from "@mui/icons-material/Telegram";

const EMAIL = "direct@zemledel.ru";
const MAX_ICON_PATH =
  "M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12m10 6c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6";

function MaxIconWithGradient({ hover }: { hover: boolean }) {
  return (
    <SvgIcon
      viewBox="0 0 24 24"
      sx={{
        fontSize: 28,
        transition: "transform 0.2s ease",
        "& path": {
          transition: "fill 0.2s ease",
        },
      }}
    >
      <defs>
        <linearGradient id="max-hover-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#229ED9" />
          <stop offset="100%" stopColor="#7B2D8E" />
        </linearGradient>
      </defs>
      <path
        d={MAX_ICON_PATH}
        fill={hover ? "url(#max-hover-gradient)" : "currentColor"}
      />
    </SvgIcon>
  );
}
const TELEGRAM_URL = "https://t.me/Valeriya_Usova";
const MAX_URL = "https://max.ru/u/f9LHodD0cOL6gASSd2_juOBU4uJL2ZZ6vsS5g6owYfqeLa7FsfLh_UoboAs";

export const Contacts = () => {
  const [maxIconHover, setMaxIconHover] = useState(false);

  return (
    <Box
      component="section"
      id="contacts"
      sx={{
        position: "relative",
        minHeight: { xs: 420, sm: 480, md: 720 },
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 35%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 1,
        },
      }}
    >
      <Image
        src="/contacts.jpg"
        alt="Контакты"
        fill
        sizes="max(100vw, 1000px)"
        style={{
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          minHeight: "inherit",
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr) auto", md: "repeat(5, minmax(0, 1fr))" },
          px: { xs: 2, md: 0 },
          gap: { xs: 2, md: 0 },
          alignItems: "center",
        }}
      >
        <Box sx={{ display: { xs: "none", md: "block" }, gridColumn: 1 }} />
        <Box
          sx={{
            gridColumn: { xs: 1, md: 2 },
            py: { xs: 4, sm: 5, md: 6 },
            px: { xs: 0, sm: 2 },
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  component="p"
                  sx={{
                    fontWeight: 700,
                    fontSize: 28,
                    letterSpacing: "-0.02em",
                    color: "common.white",
                  }}
                >
                  Валерия
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: 14,
                  color: "primary.main",
                  mt: 0.25,
                }}
              >
                Руководитель проектов
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ display: { xs: "none", md: "block" }, gridColumn: 3 }} />
        <Box
          sx={{
            gridColumn: { xs: 2, md: 4 },
            py: { xs: 4, sm: 5, md: 6 },
            px: { xs: 1, sm: 2 },
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 1.5,
          }}
        >
          <Typography
            component="a"
            href={`mailto:${EMAIL}`}
            sx={{
              fontWeight: 700,
              fontSize: { xs: 15, sm: 18 },
              whiteSpace: "nowrap",
              color: "#fff !important",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {EMAIL}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography
              component="a"
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              sx={{
                display: "inline-flex",
                textDecoration: "none",
                "& .MuiSvgIcon-root": {
                  color: "common.white",
                  transition: "color 0.2s ease, transform 0.2s ease",
                },
                "&:hover .MuiSvgIcon-root": {
                  color: "#0088cc",
                  transform: "scale(1.15)",
                },
              }}
            >
              <TelegramIcon sx={{ fontSize: 28 }} />
            </Typography>
            <Box
              component="a"
              href={MAX_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MAX"
              onMouseEnter={() => setMaxIconHover(true)}
              onMouseLeave={() => setMaxIconHover(false)}
              sx={{
                display: "inline-flex",
                textDecoration: "none",
                color: "common.white",
                "&:hover .MuiSvgIcon-root": {
                  transform: "scale(1.15)",
                },
              }}
            >
              <MaxIconWithGradient hover={maxIconHover} />
            </Box>
          </Box>
          
        </Box>
        <Box sx={{ display: { xs: "none", md: "block" }, gridColumn: 5 }} />
      </Box>
    </Box>
  );
};
