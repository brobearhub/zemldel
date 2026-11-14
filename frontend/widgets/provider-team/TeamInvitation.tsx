"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Alert,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "@/shared/ui/Link";
import { teamApi } from "@/shared/lib/team-api";

type Invitation = {
  providerName: string;
  jobTitle: string;
  role: "MANAGER" | "EMPLOYEE";
  emailHint: string;
  accepted: boolean;
};

export function TeamInvitation({ token }: { token: string }) {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [attempt, setAttempt] = useState(0);
  const returnTo = `/team-invitations/${token}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    teamApi<Invitation>(`/api/team-invitations/${encodeURIComponent(token)}`)
      .then((value) => {
        if (!cancelled) setInvitation(value);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const needsName =
    !session?.user.person?.firstName || !session?.user.person?.lastName;

  return (
    <Container
      maxWidth="sm"
      sx={{ py: 4 }}
    >
      <Paper sx={{ p: { xs: 2, sm: 4 } }}>
        <Stack spacing={2.5}>
          <Typography
            variant="h4"
            component="h1"
          >
            Приглашение в команду
          </Typography>
          {loading ? <Typography>Загружаем приглашение…</Typography> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {!loading && !invitation ? (
            <Button onClick={() => setAttempt((value) => value + 1)}>
              Повторить
            </Button>
          ) : null}
          {invitation ? (
            <>
              <Typography variant="h5">{invitation.providerName}</Typography>
              <Typography>Должность: {invitation.jobTitle}</Typography>
              <Typography>
                {invitation.role === "MANAGER"
                  ? "Менеджер: управление кабинетом исполнителя, услугами и заявками."
                  : "Сотрудник: доступ только к назначенным вам заявкам и их чатам."}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary" }}
              >
                После принятия ваше имя, фото и должность появятся в команде
                исполнителя. Приглашение отправлено на {invitation.emailHint}.
              </Typography>
              {status === "unauthenticated" ? (
                <Stack spacing={1.5}>
                  <Button
                    component={Link}
                    href={`/signin?returnTo=${encodeURIComponent(returnTo)}`}
                    variant="contained"
                  >
                    Войти и принять приглашение
                  </Button>
                  <Button
                    component={Link}
                    href={`/signup?account=provider&returnTo=${encodeURIComponent(returnTo)}`}
                  >
                    Зарегистрироваться
                  </Button>
                </Stack>
              ) : status === "authenticated" ? (
                <Stack
                  component="form"
                  spacing={2}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (busy) return;
                    setBusy(true);
                    setError(null);
                    try {
                      await teamApi(
                        `/api/team-invitations/${encodeURIComponent(token)}/accept`,
                        {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify(
                            needsName
                              ? {
                                  firstName: firstName.trim(),
                                  lastName: lastName.trim(),
                                }
                              : {},
                          ),
                        },
                      );
                      await update();
                      router.replace(
                        invitation.role === "EMPLOYEE"
                          ? "/pro/assigned"
                          : "/pro/requests/feed",
                      );
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
                  <Typography variant="body2">
                    Вы вошли как {session.user.email}
                  </Typography>
                  {session.user.accountKind !== "PROVIDER" ? (
                    <Alert severity="info">
                      Приглашение предназначено для аккаунта исполнителя.
                      Войдите с email из письма.
                    </Alert>
                  ) : (
                    <>
                      {needsName && !invitation.accepted ? (
                        <>
                          <TextField
                            label="Имя"
                            value={firstName}
                            onChange={(event) =>
                              setFirstName(event.target.value)
                            }
                            required
                            size="small"
                            disabled={busy}
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                          />
                          <TextField
                            label="Фамилия"
                            value={lastName}
                            onChange={(event) =>
                              setLastName(event.target.value)
                            }
                            required
                            size="small"
                            disabled={busy}
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                          />
                        </>
                      ) : null}
                      <Button
                        type="submit"
                        variant="contained"
                        loading={busy}
                      >
                        {invitation.accepted
                          ? "Открыть кабинет"
                          : "Принять приглашение"}
                      </Button>
                    </>
                  )}
                  <Button
                    disabled={busy}
                    onClick={() => void signOut({ callbackUrl: returnTo })}
                  >
                    Войти с другим аккаунтом
                  </Button>
                </Stack>
              ) : null}
            </>
          ) : null}
        </Stack>
      </Paper>
    </Container>
  );
}
