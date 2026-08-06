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
import Image from "next/image";
import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ServiceDto } from "@/entities/service";

const BRAND_NAME = "ЗЕМЛЕДЕЛ";
const DEVELOPED_BY = "OOO «Бурый Медведь»";

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
        color: "common.white",
        pt: { xs: 6, md: 8 },
        pb: 3,
      }}
    >
      <Container>
        <Stack spacing={{ xs: 4, md: 5 }}>
          

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                lg: "minmax(180px, 240px) 1fr 1fr minmax(180px, 220px)",
              },
              gap: { xs: 4, md: 6 },
              alignItems: "start",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start" }}>
              <Image
                src="/zemledel_logo_light.svg"
                alt=""
                width={150}
                height={100}
                style={{ objectFit: "contain" }}
              />
            </Box>
            <Stack spacing={1}>
              <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 700 }}>
                Основные услуги
              </Typography>
              {!services ? (
                <Box sx={{ py: 1 }}>
                  <CircularProgress size={18} sx={{ color: "primary.light" }} />
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
                  <CircularProgress size={18} sx={{ color: "primary.light" }} />
                </Box>
              ) : (
                <List
                  dense
                  disablePadding
                  sx={{
                    listStyle: "none",
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

            <Stack spacing={1} alignItems="flex-start">
              <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 700 }}>
                Документы
              </Typography>
              <Link
                component={NextLink}
                href="/terms"
                sx={{
                  fontSize: 14,
                  color: "common.white",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline", color: "rgba(255,255,255,0.95)" },
                }}
              >
                Пользовательское соглашение
              </Link>
              <Link
                component={NextLink}
                href="/privacy"
                sx={{
                  fontSize: 14,
                  color: "common.white",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline", color: "rgba(255,255,255,0.95)" },
                }}
              >
                Политика обработки ПДн
              </Link>
              <Link
                component={NextLink}
                href="/consent"
                sx={{
                  fontSize: 14,
                  color: "common.white",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline", color: "rgba(255,255,255,0.95)" },
                }}
              >
                Согласие на обработку ПДн
              </Link>
              <Link
                component={NextLink}
                href="/offer"
                sx={{
                  fontSize: 14,
                  color: "common.white",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline", color: "rgba(255,255,255,0.95)" },
                }}
              >
                Оферта (платные услуги)
              </Link>
            </Stack>
          </Box>

          <Box
            sx={{
              pt: 3,
              borderTop: "1px solid",
              borderColor: "rgba(255,255,255,0.16)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              © {year} <span style={{ fontWeight: 900 }}>{BRAND_NAME}</span>. Все права защищены.
            </Typography>
            <Link
              href="https://brobear.ru"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: 14,
                color: "rgba(255,255,255,0.78)",
                textDecoration: "underline",
                "&:hover": { textDecoration: "none", color: "info.main" },
              }}
            >Проектирование и разработка: {DEVELOPED_BY}</Link>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};
