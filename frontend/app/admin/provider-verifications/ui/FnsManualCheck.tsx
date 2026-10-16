"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { fnsSiteUrl, registrationNumberLabel } from "../model";

type Props = {
  requestId: string;
  providerType: string;
  inn: string | null;
  ogrn: string | null;
  fnsLabel: string;
  fnsStatus: string | null;
  fnsAvailable: boolean;
  fnsCheckedAt: string | null;
  fnsSource: string | null;
  manualCheckedAt: string | null;
};

/** Цвета с макета карточки. В палитре темы тёплой плашки и этого зелёного нет. */
const NOTICE = {
  banner: "#FDF1DB",
  icon: "#F2DEB9",
  title: "#694922",
  body: "#8A6840",
} as const;

const OK = {
  banner: "#E7F3EB",
  icon: "#D3E8D8",
  title: "#305D46",
  body: "#4E6B5C",
} as const;

const CARD = {
  primary: "#305D46",
  primaryHover: "#274E3B",
  label: "#8E9893",
  value: "#1A1A1A",
  line: "#E3E6E4",
  footer: "#8E9893",
  error: "#C62828",
} as const;

function formatMark(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(date);
  const month = new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date).replace(/\./g, "");
  const time = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" })
    .format(date)
    .replace(/[\u202f\u00a0]/g, "");
  return `${day} ${month}, ${time}`;
}

function MarkStamp({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatMark(iso));
  }, [iso]);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {label ?? "\u00a0"}
    </time>
  );
}

function RequisitePill({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string | null;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1.25,
        maxWidth: "100%",
        px: 2,
        py: 1.15,
        border: "1px solid",
        borderColor: CARD.line,
        borderRadius: 999,
        bgcolor: "#fff",
      }}
    >
      <Typography component="span" sx={{ color: CARD.label, fontSize: 15, lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography
        component="span"
        sx={{ color: CARD.value, fontWeight: 800, fontSize: 16, lineHeight: 1.2, letterSpacing: "0.01em" }}
      >
        {value ?? "—"}
      </Typography>
      {value ? (
        <Button
          onClick={onCopy}
          sx={{
            minWidth: 0,
            minHeight: 0,
            p: 0,
            color: CARD.primary,
            fontWeight: 600,
            fontSize: 15,
            lineHeight: 1.2,
            "&:hover": { bgcolor: "transparent", color: CARD.primaryHover },
          }}
        >
          {copied ? "Скопировано" : "Копировать"}
        </Button>
      ) : null}
    </Box>
  );
}

export function FnsManualCheck({
  requestId,
  providerType,
  inn,
  ogrn,
  fnsLabel,
  fnsStatus,
  fnsAvailable,
  fnsCheckedAt,
  fnsSource,
  manualCheckedAt,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const href = fnsSiteUrl(providerType);
  const registrationLabel = registrationNumberLabel(providerType);
  const positive = fnsAvailable && fnsStatus === "FOUND_ACTIVE";
  const tone = positive ? OK : NOTICE;
  const title = fnsAvailable ? fnsLabel : "Сверка с ФНС недоступна";

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setError(null);
      setCopied(label);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => {
        setCopied((current) => (current === label ? null : current));
      }, 2000);
    } catch {
      setCopied(null);
      setError("Не удалось скопировать");
    }
  }

  async function markManual() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/provider-verifications/${requestId}/fns-manual`, {
        method: "POST",
      });
      if (!response.ok) {
        setError("Не удалось записать отметку");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: "22px",
        overflow: "hidden",
        boxShadow: "0 10px 28px rgba(40, 40, 30, 0.06)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, px: 2.5, py: 2, bgcolor: tone.banner }}>
        <Box
          aria-hidden
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: "12px",
            bgcolor: tone.icon,
            color: tone.title,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          {positive ? <CheckRoundedIcon sx={{ fontSize: 22 }} /> : "!"}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: tone.title, fontWeight: 800, fontSize: 17, lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography sx={{ color: tone.body, fontSize: 14.5, lineHeight: 1.35, mt: 0.25 }}>
            {positive ? (
              <>
                {fnsSource ? `Источник: ${fnsSource}` : "Сверка выполнена"}
                {fnsCheckedAt ? (
                  <>
                    {" · "}
                    <MarkStamp iso={fnsCheckedAt} />
                  </>
                ) : null}
              </>
            ) : (
              "Не мешает решению заявки"
            )}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={1.25} sx={{ alignItems: "flex-start", px: 2.5, pt: 2.25, pb: 2.25 }}>
        <RequisitePill label="ИНН" value={inn} copied={copied === "ИНН"} onCopy={() => void copy("ИНН", inn ?? "")} />
        {registrationLabel ? (
          <RequisitePill
            label={registrationLabel}
            value={ogrn}
            copied={copied === registrationLabel}
            onCopy={() => void copy(registrationLabel, ogrn ?? "")}
          />
        ) : null}

        <Stack direction="row" spacing={1.25} useFlexGap sx={{ flexWrap: "wrap", pt: 0.75, maxWidth: "100%" }}>
          <Button
            variant="text"
            disableElevation
            disabled={busy}
            onClick={() => void markManual()}
            startIcon={<CheckRoundedIcon />}
          >
            Проверено вручную
          </Button>
          <Button
            component="a"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            disableElevation
            startIcon={<OpenInNewRoundedIcon />}
          >
            Сайт ФНС
          </Button>
        </Stack>

        {error ? (
          <Typography sx={{ color: CARD.error, fontSize: 14 }}>{error}</Typography>
        ) : null}

        {manualCheckedAt ? (
          <Typography sx={{ color: CARD.footer, fontSize: 14, lineHeight: 1.4 }}>
            Последняя отметка — <MarkStamp iso={manualCheckedAt} />
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
