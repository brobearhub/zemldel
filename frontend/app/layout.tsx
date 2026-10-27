import type { ReactNode } from "react";
import { AppProviders } from "@/core/providers/AppProviders";
import { nunitoSans } from "@/app/fonts";
import { isLlmsTxtPublic } from "@/shared/lib/llms-txt";
import { siteOrigin } from "@/shared/lib/site-origin";

import "./styles/globals.css";

interface Props {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: Props) {
  return (
    <html lang="ru" className={nunitoSans.variable} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        {isLlmsTxtPublic(siteOrigin()) ? (
          <link rel="alternate" type="text/plain" href="/llms.txt" title="Описание сайта для языковых моделей" />
        ) : null}
      </head>
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
