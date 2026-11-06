"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const COUNTER_ID = 114100847;
const SCRIPT_URL = `https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}`;

type MetrikaCommand = (...args: unknown[]) => void;
type MetrikaQueue = MetrikaCommand & { a?: unknown[][]; l?: number };

declare global {
  interface Window {
    ym?: MetrikaQueue;
    __zemledelMetrika?: {
      initialized: boolean;
      lastRoute?: string;
      lastUrl?: string;
    };
  }
}

// Query strings can contain password-reset tokens or personal data. Keep only
// standard campaign tags on public pages; authentication URLs have no query.
const CAMPAIGN_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "yclid",
  "gclid",
]);
const AUTH_PATHS = new Set(["/signin", "/signup", "/forgot-password", "/reset-password"]);

function trackingUrl(rawUrl: string): string {
  const url = new URL(rawUrl, window.location.origin);
  const isExternal = url.origin !== window.location.origin;
  for (const key of [...url.searchParams.keys()]) {
    if (isExternal || AUTH_PATHS.has(url.pathname.replace(/\/$/, "")) || !CAMPAIGN_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.hash = "";
  return url.toString();
}

/** The counter is initialized once; every client-side route change sends one hit. */
export function YandexMetrika() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (!pathname) return;

    const state = window.__zemledelMetrika ?? { initialized: false };
    window.__zemledelMetrika = state;
    const url = new URL(window.location.href);
    url.hash = "";
    const route = url.toString();
    const currentUrl = trackingUrl(route);
    const externalReferer = document.referrer ? trackingUrl(document.referrer) : "";

    if (!state.initialized) {
      if (!window.ym) {
        const queue: MetrikaQueue = (...args: unknown[]) => {
          (queue.a ??= []).push(args);
        };
        queue.l = Date.now();
        window.ym = queue;
      }

      if (!document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
        const script = document.createElement("script");
        script.async = true;
        script.src = SCRIPT_URL;
        document.head.appendChild(script);
      }

      window.ym(COUNTER_ID, "init", {
        ssr: true,
        webvisor: true,
        clickmap: true,
        ecommerce: "dataLayer",
        referrer: externalReferer,
        url: currentUrl,
        accurateTrackBounce: true,
        trackLinks: true,
        // SPA navigation is tracked explicitly below, including the first page.
        defer: true,
      });
      state.initialized = true;
    }

    if (state.lastRoute === route) return;

    const referer = state.lastUrl ?? externalReferer;
    window.ym?.(COUNTER_ID, "hit", currentUrl, { referer });
    state.lastRoute = route;
    state.lastUrl = currentUrl;
  }, [pathname, search]);

  return (
    <noscript>
      {/* The fallback is a tracking pixel, not an optimized content image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://mc.yandex.ru/watch/${COUNTER_ID}`}
        alt=""
        width={1}
        height={1}
        style={{ position: "absolute", left: "-9999px" }}
      />
    </noscript>
  );
}

export function YandexMetrikaInformer() {
  return (
    <a
      href={`https://metrika.yandex.ru/stat/?id=${COUNTER_ID}&from=informer`}
      target="_blank"
      rel="nofollow noopener noreferrer"
      aria-label="Яндекс Метрика: статистика сайта"
      style={{ display: "inline-flex", flexShrink: 0 }}
    >
      <Image
        src={`https://informer.yandex.ru/informer/${COUNTER_ID}/3_0_C0D4C0FF_A0B4A0FF_1_pageviews`}
        width={88}
        height={31}
        alt="Яндекс.Метрика"
        title="Яндекс.Метрика: данные за сегодня (просмотры, визиты и уникальные посетители)"
        unoptimized
      />
    </a>
  );
}
