"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Tooltip } from "@mui/material";
import FavoriteBorderRounded from "@mui/icons-material/FavoriteBorderRounded";
import { useAppSelector } from "@/core/store/hooks";
import { favoritesJson } from "@/features/favorites/api";
import type { InterestData } from "./InterestPage";
const requests = new Map<
  string,
  { at: number; promise: Promise<InterestData> }
>();
export function InterestCounter({ serviceId }: { serviceId?: string }) {
  const scope = useAppSelector(
    (state) => `${state.auth.user?.id}:${state.auth.user?.activeProviderId}`,
  );
  const [data, setData] = useState<InterestData | null>(null);
  useEffect(() => {
    let alive = true;
    setData(null);
    const load = () => {
      let request = requests.get(scope);
      if (!request || Date.now() - request.at > 15000) {
        request = {
          at: Date.now(),
          promise: favoritesJson<InterestData>("/api/pro/interest?summary=1"),
        };
        requests.set(scope, request);
      }
      void request.promise
        .then((value) => {
          if (alive) setData(value);
        })
        .catch(() => {
          requests.delete(scope);
        });
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      window.removeEventListener("focus", load);
    };
  }, [scope]);
  const count = serviceId
    ? (data?.services.find((service) => service.id === serviceId)?.count ?? 0)
    : (data?.profileCount ?? 0);
  return (
    <Tooltip
      title={
        serviceId
          ? "Клиенты, сохранившие эту услугу"
          : "Клиенты, сохранившие ваш профиль"
      }
    >
      <Button
        component={Link}
        href={`/pro/interest?${serviceId ? `serviceId=${encodeURIComponent(serviceId)}` : "filter=profile"}`}
        size="small"
        startIcon={<FavoriteBorderRounded />}
        sx={{ alignSelf: "flex-start" }}
      >
        {serviceId ? "В избранном" : "Вы в избранном"}
        {data ? `: ${count}` : ""}
      </Button>
    </Tooltip>
  );
}
