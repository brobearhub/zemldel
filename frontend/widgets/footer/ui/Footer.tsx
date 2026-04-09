"use client";

import {
  Box,
  CircularProgress,
  Container,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import TelegramIcon from "@mui/icons-material/Telegram";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ServiceDto } from "@/entities/service";

const COMPANY_NAME = "Новые горизонты";
const PHONE = "+7 922 104 75 86";
const TELEGRAM_URL = "https://t.me/+79221047586";

export const Footer = () => {
  const year = new Date().getFullYear();
  const [services, setServices] = useState<ServiceDto[] | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch services");
        return res.json() as Promise<ServiceDto[]>;
      })
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  const mainServices = useMemo(
    () =>
      (services ?? [])
        .filter((s) => s.category?.slug === "main")
        .map((s) => ({ title: s.title, id: s.id })),
    [services]
  );
  const legalServiceTitles = useMemo(
    () => (services ?? []).filter((s) => s.category?.slug === "legal").map((s) => s.title),
    [services]
  );

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: (theme) => theme.custom.bgColors.secondary,
        // color: (theme) =>
        //   theme.palette.mode === "dark" ? "common.white" : theme.palette.text.primary,
        color: "common.white",
        pt: { xs: 6, md: 8 },
        pb: 3,
      }}
    >
      <Container>
        <Stack spacing={{ xs: 4, md: 5 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography
              component="p"
              sx={{
                // flex: { xs: "none", sm: 1 },
                fontWeight: 900,
                fontSize: { xs: 32, sm: 40, md: 48 },
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                textTransform: "uppercase",
              }}
            >
              {COMPANY_NAME}
            </Typography>
            <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
              <Image
                src="/logo.svg"
                alt=""
                width={150}
                height={100}
                style={{ objectFit: "contain" }}
              />
            </Box>
            <Box
              sx={{
                // flex: { xs: "none", sm: 1 },
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Link
                href={`tel:${PHONE.replace(/\s/g, "")}`}
                sx={{
                  color: "secondary.main",
                  fontWeight: 700,
                  fontSize: 18,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {PHONE}
              </Link>
              <Link
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                sx={{
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "common.white" : "text.primary",
                  "&:hover": { color: "#0088cc" },
                }}
              >
                <TelegramIcon sx={{ fontSize: 28 }} />
              </Link>
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                lg: "1fr 2fr",
              },
              gap: { xs: 4, md: 6 },
              alignItems: "start",
            }}
          >
            <Stack spacing={1}>
              <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 700 }}>
                Основные услуги
              </Typography>
              {!services ? (
                <Box sx={{ py: 1 }}>
                  <CircularProgress size={18} sx={{ color: "secondary.main" }} />
                </Box>
              ) : (
                <List dense disablePadding sx={{ listStyle: "none" }}>
                  {mainServices.map((item) => (
                    <ListItem key={item.id} disableGutters sx={{ py: 0.25 }}>
                      <ListItemText
                        primary={item.title}
                        primaryTypographyProps={{
                          sx: {
                            fontSize: 14,
                            color: "common.white",
                          },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>

            <Stack spacing={1} alignItems="flex-start">
              <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 700 }}>
                Юридические услуги
              </Typography>
              {!services ? (
                <Box sx={{ py: 1 }}>
                  <CircularProgress size={18} sx={{ color: "secondary.main" }} />
                </Box>
              ) : (
                <List
                  dense
                  disablePadding
                  sx={{
                    listStyle: "none",
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                    },
                    columnGap: { xs: 0, sm: 2, md: 3 },
                    alignItems: "start",
                  }}
                >
                  {legalServiceTitles.map((title) => (
                    <ListItem
                      key={title}
                      disableGutters
                      sx={{ py: 0.25, alignItems: "flex-start" }}
                    >
                      <ListItemText
                        primary={title}
                        primaryTypographyProps={{
                          sx: {
                            fontSize: 14,
                            color: "common.white",
                          },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>
          </Box>

          <Box
            sx={{
              pt: 3,
              borderTop: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "grey.700" : "divider",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                color: (theme) =>
                  theme.palette.mode === "dark" ? "grey.500" : "text.secondary",
              }}
            >
              Усова Валерия Арсеновна © {year} {COMPANY_NAME}
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};
