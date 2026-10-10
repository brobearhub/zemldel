"use client";

import { Stack, Typography } from "@mui/material";
import { CdnAvatar } from "@/shared/ui/cdn-image";
import type { ReplyPreviewLine } from "../lib/reply-preview";

export type ReplyPreviewAvatar = {
  src: string | null;
  name: string | null;
};

type Props = {
  lines: readonly ReplyPreviewLine[];
  ownAuthor: ReplyPreviewLine["author"];
  ownAvatar?: ReplyPreviewAvatar | null;
};

function avatarInitials(name: string | null | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts[1]?.charAt(0) ?? "";
  const letters = (first + second).toLocaleUpperCase("ru-RU");
  return letters.length > 0 ? letters : "В";
}

/** Why: чужая реплика — только текст, своя — аватар слева. Пустое место строки остаётся кликабельным. */
export function ReplyPreviewLines({ lines, ownAuthor, ownAvatar = null }: Props) {
  const avatarName = ownAvatar?.name?.trim() || "Вы";
  return (
    <Stack sx={{ gap: "6px", width: "fit-content", maxWidth: "100%", minWidth: 0, pointerEvents: "none" }}>
      {lines.map((line) => {
        const own = line.author === ownAuthor;
        const text = line.body;
        return (
          <Stack
            key={line.author}
            direction="row"
            sx={{ alignItems: "center", gap: 1, maxWidth: "100%", minWidth: 0, pointerEvents: "auto" }}
          >
            {own ? (
              <CdnAvatar
                src={ownAvatar?.src || undefined}
                alt={avatarName}
                sx={{
                  width: 18,
                  height: 18,
                  flexShrink: 0,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {avatarInitials(ownAvatar?.name)}
              </CdnAvatar>
            ) : null}
            <Typography
              noWrap
              title={text}
              sx={{
                minWidth: 0,
                fontSize: 14,
                lineHeight: 1.35,
                color: own ? "text.secondary" : "text.primary",
              }}
            >
              {text}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}
