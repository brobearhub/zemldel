"use client";

import Link from "next/link";
import { Box } from "@mui/material";
import { usePathname } from "next/navigation";

const items = [
  { label: "Услуги", href: "/#home-services", pathname: "/" },
  { label: "Участки", href: "/lands", pathname: "/lands" },
] as const;

export function HeaderCatalogNav() {
  const pathname = usePathname();
  const section = pathname.startsWith("/lands/") ? "/lands" : pathname;

  return (
    <Box
      component="nav"
      aria-label="Каталог услуг и участков"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: {
          xs: 0.5,
          lg: 1,
        },
      }}
    >
      {items.map((item) => (
        <Box
          key={item.pathname}
          component={Link}
          href={item.href}
          aria-current={pathname === item.pathname ? "page" : section === item.pathname ? "location" : undefined}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 44,
            px: {
              xs: 0.75,
              tablet: 1.5,
              lg: 2,
            },
            color: section === item.pathname ? "text.primary" : "text.secondary",
            fontSize: "1rem",
            fontWeight: section === item.pathname ? 700 : 400,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {item.label}
        </Box>
      ))}
    </Box>
  );
}
