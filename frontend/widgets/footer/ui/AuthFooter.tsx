"use client";

import { Box, Typography } from "@mui/material";
import Link from "@/shared/ui/Link";

const LINKS = [
  { href: "/terms", label: "Соглашение" },
  { href: "/privacy", label: "Политика" },
  { href: "/consent", label: "Согласие" },
  { href: "/offer", label: "Оферта" },
] as const;

/** Why: полный подвал на входе раздувает страницу; здесь только копирайт и юридические ссылки. */
export function AuthFooter() {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "background.default",
        color: "text.primary",
        px: 2,
        py: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          columnGap: 2,
          rowGap: 0.5,
          maxWidth: 960,
          mx: "auto",
        }}
      >
        <Typography variant="body2">© {year} Земледел</Typography>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            sx={{
              color: "text.primary",
              fontWeight: 600,
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            {link.label}
          </Link>
        ))}
      </Box>
    </Box>
  );
}
