"use client";

import Link from "next/link";
import { Box } from "@mui/material";
import { usePathname } from "next/navigation";

const items = [
  {
    label: "Услуги",
    href: "/#home-services",
    pathname: "/",
    subpaths: ["/services/", "/service-categories/"],
  },
  {
    label: "Участки",
    href: "/lands",
    pathname: "/lands",
    subpaths: ["/lands/"],
  },
] as const;

export function HeaderCatalogNav() {
  const pathname = usePathname();

  return (
    <Box
      component="nav"
      aria-label="Каталог услуг и участков"
      sx={{
        display: "flex",
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        gap: {
          xs: 0.5,
          lg: 1,
        },
      }}
    >
      {items.map((item) => {
        const isPage = pathname === item.pathname;
        const isCurrent =
          isPage || item.subpaths.some((path) => pathname.startsWith(path));
        return (
          <Box
            key={item.pathname}
            component={Link}
            href={item.href}
            aria-current={isPage ? "page" : isCurrent ? "location" : undefined}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 44,
              px: {
                xs: 0.75,
                tablet: 1.5,
                lg: 2,
              },
              color: isCurrent ? "text.primary" : "text.secondary",
              fontSize: "1rem",
              fontWeight: isCurrent ? 700 : 400,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </Box>
        );
      })}
    </Box>
  );
}
