"use client";

import NextLink, { type LinkProps } from "next/link";
import { Box, type BoxProps } from "@mui/material";
import { forwardRef } from "react";

export type AppLinkProps = Omit<BoxProps, "component" | "href"> &
  LinkProps & {
    href: LinkProps["href"];
  };

/**
 * Why: `next/link` — функция. Серверный компонент не может передать её в MUI
 * через `component={Link}`: страница падает при сериализации пропов.
 * Ссылку рендерим этим компонентом: `<Link href>`.
 */
const Link = forwardRef<HTMLAnchorElement, AppLinkProps>(function Link({ href, ...props }, ref) {
  return <Box ref={ref} component={NextLink} href={href} {...props} />;
});

export default Link;
