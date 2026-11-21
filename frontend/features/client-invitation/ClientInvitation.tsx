"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, CircularProgress, Container, Paper, Stack, Typography } from "@mui/material";
import { REQUESTS_PROFILE_URL } from "@/entities/request/pending-request";
import { teamApi } from "@/shared/lib/team-api";
import { useClientInvitation } from "./use-client-invitation";

export function ClientInvitation({ path }: { path: string }) {
  const { preview, loading, error } = useClientInvitation(path);
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const router = useRouter();
  const returnTo = encodeURIComponent(path);
  const signin = `/signin?returnTo=${returnTo}`;
  const recipient = session?.user.accountKind === "CUSTOMER" &&
    session.user.email?.trim().toLowerCase() === preview?.email.toLowerCase();

  async function connect() {
    setBusy(true);
    setFailure("");
    try {
      await teamApi(`/api${path}/accept`, {
        method: "POST", headers: { "content-type": "application/json" }, body: "{}",
      });
      router.replace(REQUESTS_PROFILE_URL);
      router.refresh();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Не удалось подключиться");
      setBusy(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Stack spacing={2}>
          <Typography component="h1" variant="h4">Приглашение от исполнителя</Typography>
          {loading || status === "loading" ? <CircularProgress size={24} aria-label="Загружаем приглашение" /> : null}
          {error ? <Alert severity="warning">{error}</Alert> : null}
          {preview ? <>
            <Typography variant="h5">{preview.providerName}</Typography>
            <Typography>После подключения в вашем кабинете появятся заявки этого исполнителя. Условия работ и договор вы сможете согласовать отдельно.</Typography>
            <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Почта для подключения — {preview.email}</Typography>
            {status === "unauthenticated" ? <>
              <Button component={Link} href={signin} variant="contained">Войти</Button>
              <Button component={Link} href={`/signup?account=customer&returnTo=${returnTo}`}>Зарегистрироваться как клиент</Button>
            </> : null}
            {status === "authenticated" && !recipient ? <>
              <Alert severity="info">Вы вошли как {session?.user.email}. Для подключения нужен аккаунт клиента с почтой из приглашения.</Alert>
              <Button onClick={() => void signOut({ callbackUrl: signin })}>Войти с приглашённой почтой</Button>
            </> : null}
            {status === "authenticated" && recipient ? <>
              {failure ? <Alert severity="warning">{failure}</Alert> : null}
              <Button variant="contained" loading={busy} onClick={() => void connect()}>
                {preview.accepted ? "Открыть мои заявки" : "Подключиться к исполнителю"}
              </Button>
              {failure ? <Button component={Link} href={`${signin}&reauth=1`}>Войти и подтвердить почту</Button> : null}
            </> : null}
          </> : null}
        </Stack>
      </Paper>
    </Container>
  );
}
