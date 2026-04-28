"use client";

import NextLink, { type LinkProps } from "next/link";
import { forwardRef, type AnchorHTMLAttributes } from "react";

export type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  LinkProps & {
    href: LinkProps["href"];
  };

const Link = forwardRef<HTMLAnchorElement, AppLinkProps>(function Link({ href, ...props }, ref) {
  return <NextLink ref={ref} href={href} {...props} />;
});

export default Link;

