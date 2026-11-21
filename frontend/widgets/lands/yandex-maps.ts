import * as React from "react";
import * as ReactDOM from "react-dom";
import type { LngLat } from "@yandex/ymaps3-types";

function getMapsReady() {
  return typeof ymaps3 === "undefined" ? undefined : ymaps3.ready;
}

function loadScript(key: string): Promise<void> {
  const ready = getMapsReady();
  if (ready) return ready;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(fail, 15000);
    function fail() {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error("Не удалось загрузить Яндекс Карты"));
    }
    const url = new URL("https://api-maps.yandex.ru/v3/");
    url.searchParams.set("apikey", key);
    url.searchParams.set("lang", "ru_RU");
    script.src = url.toString();
    script.async = true;
    script.onerror = fail;
    script.onload = () => {
      const loaded = getMapsReady();
      if (!loaded) return fail();
      loaded.then(() => {
        window.clearTimeout(timeout);
        resolve();
      }, fail);
    };
    document.head.append(script);
  });
}

async function initializeMaps() {
  const response = await fetch("/api/lands/map-config", { cache: "no-store" });
  if (!response.ok) throw new Error("Не удалось загрузить настройки карты");
  const keys: { jsApiKey: string } = await response.json();
  if (!keys.jsApiKey) throw new Error("Карта пока не подключена");
  await loadScript(keys.jsApiKey);
  const [{ reactify }, controls] = await Promise.all([
    ymaps3.import("@yandex/ymaps3-reactify"),
    ymaps3.import("@yandex/ymaps3-controls-extra"),
  ]);
  const adapter = reactify.bindTo(React, ReactDOM);
  return {
    ...adapter.module(ymaps3),
    YMapOpenMapsButton: adapter.entity(controls.YMapOpenMapsButton),
  };
}

export type LandMapsSdk = Awaited<ReturnType<typeof initializeMaps>>;
let pending: Promise<LandMapsSdk> | undefined;

export function loadLandMaps() {
  pending ??= initializeMaps().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

export function validCoordinates(value?: LngLat): value is LngLat {
  return !!value && Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 85;
}
