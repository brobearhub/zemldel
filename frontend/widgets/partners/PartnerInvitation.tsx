"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { getActiveMembership } from "@/core/auth/authorization";
import { teamApi } from "@/shared/lib/team-api";

export function PartnerInvitation({ token }: { token: string }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invitation, setInvitation] = useState<{
    providerName: string;
    emailHint: string;
    accepted: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const returnTo = `/partner-invitations/${token}`;
  const membership = getActiveMembership(session?.user ?? null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    teamApi<NonNullable<typeof invitation>>(
      `/api/partner-invitations/${encodeURIComponent(token)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setInvitation(data);
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, attempt]);
  return (
    <Container
      maxWidth="sm"
      sx={{ py: 4 }}
    >
      <Paper
        sx={{
          p: {
            xs: 2,
            sm: 4,
          },
        }}
      >
        <Stack spacing={2.5}>
          <Typography
            component="h1"
            variant="h4"
          >
            Приглашение в партнёры
          </Typography>
          {loading ? (
            <CircularProgress
              size={24}
              aria-label="Загружаем приглашение"
            />
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {!loading && !invitation ? (
            <Button onClick={() => setAttempt((value) => value + 1)}>
              Повторить
            </Button>
          ) : null}
          {invitation ? (
            <>
              <Typography variant="h5">{invitation.providerName}</Typography>
              <Typography>
                После подтверждения вы сможете общаться в чате и передавать друг
                другу заявки без подписанного договора и оплат.
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Приглашение отправлено на {invitation.emailHint}.
              </Typography>
              {status === "unauthenticated" ? (
                <Stack spacing={1}>
                  <Button
                    component={Link}
                    href={`/signin?returnTo=${encodeURIComponent(returnTo)}`}
                    variant="contained"
                  >
                    Войти и подтвердить
                  </Button>
                  <Button
                    component={Link}
                    href={`/signup?account=provider&returnTo=${encodeURIComponent(returnTo)}`}
                  >
                    Зарегистрироваться как исполнитель
                  </Button>
                </Stack>
              ) : status === "authenticated" ? (
                <>
                  <Typography variant="body2">
                    Вы вошли как {session.user.email}
                  </Typography>
                  {session.user.accountKind !== "PROVIDER" ? (
                    <Alert severity="info">
                      Приглашение предназначено для аккаунта исполнителя.
                    </Alert>
                  ) : !membership ? (
                    <>
                      <Typography>
                        Создайте профиль исполнителя, затем вернитесь к
                        подтверждению партнёрства.
                      </Typography>
                      <Button
                        component={Link}
                        href={`/providers/new?returnTo=${encodeURIComponent(returnTo)}`}
                        variant="contained"
                      >
                        Создать профиль исполнителя
                      </Button>
                    </>
                  ) : membership.role === "EMPLOYEE" ? (
                    <Alert severity="info">
                      Принимать приглашения может владелец или менеджер профиля.
                    </Alert>
                  ) : (
                    <>
                      <Typography variant="body2">
                        Профиль: {membership.providerName}
                      </Typography>
                      <Button
                        variant="contained"
                        loading={busy}
                        onClick={async () => {
                          setBusy(true);
                          setError(null);
                          try {
                            await teamApi(
                              `/api/partner-invitations/${encodeURIComponent(token)}/accept`,
                              {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: "{}",
                              },
                            );
                            router.replace("/pro/partners");
                            router.refresh();
                          } catch (reason) {
                            setError(
                              reason instanceof Error
                                ? reason.message
                                : "Не удалось принять приглашение",
                            );
                            setBusy(false);
                          }
                        }}
                      >
                        {invitation.accepted
                          ? "Открыть партнёров"
                          : "Подтвердить партнёрство"}
                      </Button>
                    </>
                  )}
                  <Button
                    disabled={busy}
                    onClick={() => void signOut({ callbackUrl: returnTo })}
                  >
                    Войти с другим аккаунтом
                  </Button>
                </>
              ) : null}
            </>
          ) : null}
        </Stack>
      </Paper>
    </Container>
  );
}
