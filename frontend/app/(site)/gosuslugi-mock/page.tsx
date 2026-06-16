"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Box, Button, Container, Paper, Stack, Typography } from "@mui/material";

type Mode = "link" | "verify";

function normalizeMode(value: string | null): Mode {
  return value === "verify" ? "verify" : "link";
}

function GosuslugiMockPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = useMemo(() => normalizeMode(searchParams.get("mode")), [searchParams]);
  const returnTo = useMemo(() => searchParams.get("returnTo") ?? "/profile", [searchParams]);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gosuslugi-mock/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, returnTo }),
      });
      const data = (await res.json().catch(() => null)) as { redirectTo?: string; error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Не удалось завершить проверку через Госуслуги");
        return;
      }
      router.push(data?.redirectTo ?? returnTo);
      router.refresh();
    } catch {
      setError("Не удалось завершить проверку через Госуслуги");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <Container maxWidth="sm" sx={{ py: 4, pb: 10 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              Госуслуги (мок)
            </Typography>
            <Typography color="text.secondary">
              Это временная страница-заглушка для step-up авторизации перед юридически значимыми действиями.
            </Typography>
          </Box>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <Typography fontWeight={700}>
                Режим: {mode === "verify" ? "подтверждение (step-up)" : "подключение провайдера"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Нажмите «Подтвердить», чтобы имитировать успешный вход через Госуслуги.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="contained" onClick={() => void handleConfirm()} disabled={busy}>
                  Подтвердить
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    router.push(returnTo);
                    router.refresh();
                  }}
                  disabled={busy}
                >
                  Отмена
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </main>
  );
}

export default function GosuslugiMockPage() {
  return (
    <Suspense fallback={null}>
      <GosuslugiMockPageContent />
    </Suspense>
  );
}

