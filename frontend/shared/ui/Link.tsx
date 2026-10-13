"use client";

import NextLink, { type LinkProps } from "next/link";
import { Box, type BoxProps } from "@mui/material";
import { forwardRef } from "react";

export type AppLinkProps = Omit<BoxProps, "component" | "href"> &
  LinkProps & {
    href: LinkProps["href"];
    target?: string;
    rel?: string;
  };

/**
 * Why: `next/link` — функция. Серверный компонент не может передать её в MUI
 * через `component={Link}`: страница падает при сериализации пропов.
 * Ссылку рендерим этим компонентом: `<Link href>`.
 */
const Link = forwardRef<HTMLAnchorElement, AppLinkProps>(function Link({ href, ...props }, ref) {
  // Why: перегрузка Box `component={NextLink}` не сходится с пропсами div (события вроде onCopy).
  // На рантайме это тот же NextLink, утверждение только для типа.
  const boxProps = { ...props, ref, component: NextLink, href } as BoxProps;
  return <Box {...boxProps} />;
});

export default Link;
