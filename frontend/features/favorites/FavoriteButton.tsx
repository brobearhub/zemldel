"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Alert,
  CircularProgress,
  IconButton,
  Snackbar,
  Tooltip,
} from "@mui/material";
import FavoriteRounded from "@mui/icons-material/FavoriteRounded";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/core/store/hooks";
import {
  favoriteSnapshot,
  loadFavorite,
  seedFavorite,
  subscribeFavorites,
  toggleFavorite,
  type FavoriteKind,
} from "./store";

export function FavoriteButton({
  kind,
  id,
  initiallySaved,
}: {
  kind: FavoriteKind;
  id: string;
  initiallySaved?: boolean;
}) {
  const { user, status } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const userId = user?.id ?? "";
  const entry = useSyncExternalStore(
    subscribeFavorites,
    () => favoriteSnapshot(userId, kind, id),
    () => favoriteSnapshot("", kind, id),
  );
  const eligible =
    status === "authenticated" &&
    user?.accountKind !== "PROVIDER" &&
    user?.systemRole !== "PLATFORM_ADMIN";
  useEffect(() => {
    if (!eligible) return;
    if (initiallySaved !== undefined)
      seedFavorite(userId, kind, id, initiallySaved);
    else loadFavorite(userId, kind, id);
  }, [userId, kind, id, eligible, initiallySaved]);
  if (status === "authenticated" && !eligible) return null;
  const label = entry.error
    ? "Повторить загрузку избранного"
    : entry.saved
      ? "Удалить из избранного"
      : kind === "services"
        ? "Сохранить услугу"
        : "Сохранить исполнителя";
  return (
    <>
      <Tooltip title={label}>
        <span>
          <IconButton
            aria-label={label}
            aria-pressed={eligible && entry.saved}
            disabled={status === "unknown" || (eligible && entry.loading)}
            onClick={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!eligible) {
                router.push(
                  `/signin?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`,
                );
                return;
              }
              try {
                await toggleFavorite(userId, kind, id);
              } catch (error) {
                setNotice(
                  error instanceof Error
                    ? error.message
                    : "Не удалось сохранить",
                );
              }
            }}
            disableRipple
            sx={{
              width: 44,
              height: 44,
              bgcolor: "transparent",
              color: eligible && entry.saved ? "accent.main" : "text.secondary",
              "&:hover": {
                bgcolor: "transparent",
                color: "accent.main",
              },
              "& .MuiSvgIcon-root path": {
                fill: "currentColor",
                fillOpacity: eligible && entry.saved ? 1 : 0.3,
                stroke: "currentColor",
                strokeOpacity: 0.9,
                strokeWidth: 1.5,
                strokeLinejoin: "round",
              },
              "&:hover .MuiSvgIcon-root path": {
                fillOpacity: 1,
              },
            }}
          >
            {eligible && entry.loading ? (
              <CircularProgress
                size={20}
                color="inherit"
              />
            ) : (
              <FavoriteRounded />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={8000}
        onClose={() => setNotice(null)}
      >
        <Alert
          severity="error"
          onClose={() => setNotice(null)}
        >
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
