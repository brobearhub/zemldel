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
  useTheme,
} from "@mui/material";
import Image from "next/image";
import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ServiceCategoryRow } from "@/widgets/service-categories/ui/ServiceCategoriesSection";

const BRAND_NAME = "ЗЕМЛЕДЕЛ";
const DEVELOPED_BY = "OOO «Бурый Медведь»";

export const Footer = () => {
  const year = new Date().getFullYear();
  const [categories, setCategories] = useState<ServiceCategoryRow[] | null>(null);

  useEffect(() => {
    fetch("/api/service-categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json() as Promise<ServiceCategoryRow[]>;
      })
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  const logoSrc = isLight ? "/zemledel_logo_dark.svg" : "/zemledel_logo_light.svg";
  const rootCategories = useMemo(() => {
    const roots = (categories ?? []).filter((c) => c.parentId == null);
    return [...roots]
      .sort((a, b) => {
        const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
        const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name, "ru");
      })
      .slice(0, 8);
  }, [categories]);

  const templateCategories = useMemo(() => {
    const leaf = (categories ?? []).filter((c) => c.parentId != null);
    return [...leaf]
      .sort((a, b) => {
        const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
        const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name, "ru");
      })
      .slice(0, 10);
  }, [categories]);

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: (theme) => theme.custom.bgColors.secondary,
        color: (theme) =>
          theme.palette.mode === "light"
            ? theme.palette.text.primary
            : theme.palette.common.white,
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
                src={logoSrc}
                alt=""
                width={150}
                height={100}
                style={{ objectFit: "contain" }}
              />
            </Box>
            <Stack spacing={1}>
              <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 700 }}>
                Категории
              </Typography>
              {!categories ? (
                <Box sx={{ py: 1 }}>
                  <CircularProgress size={18} sx={{ color: "primary.light" }} />
                </Box>
              ) : (
                <List dense disablePadding sx={{ listStyle: "none" }}>
                  {rootCategories.map((item) => (
                    <ListItem key={item.id} disableGutters sx={{ py: 0.25 }}>
                      <Link
                        component={NextLink}
                        href={`/service-categories/${item.id}`}
                        sx={{
                          fontSize: 14,
                          color: "inherit",
                          textDecoration: "none",
                          "&:hover": { textDecoration: "underline", opacity: 0.85 },
                        }}
                      >
                        {item.name}
                      </Link>
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>

            <Stack spacing={1} sx={{
              alignItems: "flex-start"
            }}>
              <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 700 }}>
                Шаблоны услуг
              </Typography>
              {!categories ? (
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
                  {templateCategories.map((item) => (
                    <ListItem
                      key={item.id}
                      disableGutters
                      sx={{ py: 0.25, alignItems: "flex-start" }}
                    >
                      <Link
                        component={NextLink}
                        href={`/service-categories/${item.id}`}
                        sx={{
                          fontSize: 14,
                          color: "inherit",
                          textDecoration: "none",
                          "&:hover": { textDecoration: "underline", opacity: 0.85 },
                        }}
                      >
                        {item.name}
                      </Link>
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>

            <Stack spacing={1} sx={{
              alignItems: "flex-start"
            }}>
              <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 700 }}>
                Документы
              </Typography>
              <Link
                component={NextLink}
                href="/terms"
                sx={{
                  fontSize: 14,
                  color: "inherit",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline", opacity: 0.85 },
                }}
              >
                Пользовательское соглашение
              </Link>
              <Link
                component={NextLink}
                href="/privacy"
                sx={{
                  fontSize: 14,
                  color: "inherit",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline", opacity: 0.85 },
                }}
              >
                Политика обработки ПДн
              </Link>
              <Link
                component={NextLink}
                href="/consent"
                sx={{
                  fontSize: 14,
                  color: "inherit",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline", opacity: 0.85 },
                }}
              >
                Согласие на обработку ПДн
              </Link>
              <Link
                component={NextLink}
                href="/offer"
                sx={{
                  fontSize: 14,
                  color: "inherit",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline", opacity: 0.85 },
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
              borderColor: (theme) =>
                theme.palette.mode === "light"
                  ? "rgba(0,0,0,0.16)"
                  : "rgba(255,255,255,0.16)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                color: (theme) =>
                  theme.palette.mode === "light"
                    ? "rgba(0,0,0,0.72)"
                    : "rgba(255,255,255,0.78)",
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
                color: (theme) =>
                  theme.palette.mode === "light"
                    ? "rgba(0,0,0,0.72)"
                    : "rgba(255,255,255,0.78)",
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
