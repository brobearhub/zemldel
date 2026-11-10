"use client";

import Image from "next/image";
import { Box, Stack, Typography } from "@mui/material";

const EMAIL = "direct@zemledel.ru";
const TELEGRAM_URL = "https://t.me/Valeriya_Usova";
const MAX_URL =
  "https://max.ru/u/f9LHodD0cOL6gASSd2_juOBU4uJL2ZZ6vsS5g6owYfqeLa7FsfLh_UoboAs";

export const Contacts = () => {
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
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(5, minmax(0, 1fr))",
          },
          px: { xs: 2, md: 0 },
          gap: { xs: 2, md: 0 },
          alignItems: "center",
        }}
      >
        <Box sx={{ display: { xs: "none", md: "block" }, gridColumn: 1 }} />
        <Box
          sx={{
            gridColumn: { xs: 1, md: 2 },
            py: 3,
            px: 2,
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  component="p"
                  sx={{
                    fontWeight: 700,
                    fontSize: "1.75rem",
                    letterSpacing: "-0.02em",
                    color: "common.white",
                  }}
                >
                  Валерия
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: "1rem",
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
            gridColumn: { xs: 1, sm: 2, md: 4 },
            py: 3,
            px: 2,
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
              fontSize: { xs: "1rem", sm: "1.125rem" },
              whiteSpace: "normal",
              color: "common.white",
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
                "& img": {
                  transition: "transform 0.2s ease",
                },
                "&:hover img": {
                  transform: "scale(1.15)",
                },
              }}
            >
              <Image
                src="/messengers/telegram.png"
                alt=""
                width={28}
                height={28}
              />
            </Typography>
            <Box
              component="a"
              href={MAX_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MAX"
              sx={{
                display: "inline-flex",
                textDecoration: "none",
                color: "common.white",
                "& img": {
                  transition: "transform 0.2s ease",
                },
                "&:hover img": {
                  transform: "scale(1.15)",
                },
              }}
            >
              <Image
                src="/messengers/max.png"
                alt=""
                width={28}
                height={28}
              />
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: { xs: "none", md: "block" }, gridColumn: 5 }} />
      </Box>
    </Box>
  );
};
