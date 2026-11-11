import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { AppProviders } from "@/core/providers/AppProviders";
import { nunitoSans } from "@/app/fonts";
import { isLlmsTxtPublic } from "@/shared/lib/llms-txt";
import { siteOrigin } from "@/shared/lib/site-origin";
import { YandexMetrika } from "@/widgets/analytics/ui/YandexMetrika";
import { siteIconUrl } from "@/shared/config/site-icons";

import "./styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "Земледел — земельные и кадастровые услуги",
  manifest: siteIconUrl("site.webmanifest"),
  icons: {
    icon: [
      {
        url: siteIconUrl("favicon.ico"),
        sizes: "16x16 32x32 48x48 64x64 128x128 256x256",
        type: "image/x-icon",
      },
      {
        url: siteIconUrl("favicon-16x16.png"),
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: siteIconUrl("favicon-32x32.png"),
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: siteIconUrl("favicon-48x48.png"),
        sizes: "48x48",
        type: "image/png",
      },
      {
        url: siteIconUrl("favicon.svg"),
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: siteIconUrl("apple-touch-icon.png"),
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

interface Props {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: Props) {
  return (
    <html lang="ru" className={nunitoSans.variable} suppressHydrationWarning>
      <head>
        {isLlmsTxtPublic(siteOrigin()) ? (
          <link rel="alternate" type="text/plain" href="/llms.txt" title="Описание сайта для языковых моделей" />
        ) : null}
      </head>
      <body>
        <Suspense fallback={null}>
          <YandexMetrika />
        </Suspense>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
