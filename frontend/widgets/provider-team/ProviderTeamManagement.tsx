"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { JobTitleField } from "@/shared/ui/JobTitleField";
import { teamApi } from "@/shared/lib/team-api";
import { ProviderJobTitle } from "./ProviderJobTitle";

type TeamRole = "MANAGER" | "EMPLOYEE";
export type ProviderMemberRecord = {
  id: string;
  role: "OWNER" | TeamRole;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  jobTitle: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  };
};
type TeamInvite = {
  id: string;
  email: string;
  jobTitle: string;
  role: TeamRole;
  expiresAt: string;
};
export type ProviderMembersResponse = {
  id: string;
  name: string;
  slug: string;
  type: "INDIVIDUAL" | "SELF_EMPLOYED" | "SOLE_PROPRIETOR" | "COMPANY";
  members: ProviderMemberRecord[];
  teamInvitations?: TeamInvite[];
};

export const providerRoleLabel = (role: ProviderMemberRecord["role"]) =>
  role === "OWNER" ? "Владелец" : role === "MANAGER" ? "Менеджер" : "Сотрудник";

export function ProviderTeamManagement({
  providerId,
  isOwner,
  data,
  onChange,
}: {
  providerId: string;
  isOwner: boolean;
  data: ProviderMembersResponse | null;
  onChange: (value: ProviderMembersResponse) => void;
}) {
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<TeamRole>("EMPLOYEE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function refresh() {
    const updated = await teamApi<ProviderMembersResponse>(
      `/api/providers/${providerId}/members`,
    );
    if (mounted.current) onChange(updated);
  }

  async function sendInvitation(input: {
    email: string;
    jobTitle: string;
    role: TeamRole;
  }) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await teamApi(`/api/providers/${providerId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      setSuccess(
        `Приглашение отправлено на ${input.email}. Сотрудник появится в команде после принятия.`,
      );
      setEmail("");
      setJobTitle("");
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось отправить приглашение",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography
        component="h2"
        variant="h6"
      >
        Команда исполнителя
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      {data?.members.map((member) => (
        <Paper
          key={member.id}
          variant="outlined"
          sx={{ p: 2 }}
        >
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 700 }}>
              {member.user.name || member.user.email}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                overflowWrap: "anywhere",
              }}
            >
              {member.user.email} · {providerRoleLabel(member.role)}
              {member.status === "SUSPENDED" ? " · Доступ приостановлен" : ""}
            </Typography>
            <ProviderJobTitle
              value={member.jobTitle}
              editable={isOwner}
              onSave={async (title) => {
                await teamApi(
                  `/api/providers/${providerId}/members/${member.id}`,
                  {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ jobTitle: title }),
                  },
                );
                await refresh();
              }}
            />
          </Stack>
        </Paper>
      ))}
      {isOwner ? (
        <>
          <Paper
            variant="outlined"
            sx={{ p: 2 }}
          >
            <Stack
              component="form"
              spacing={2}
              onSubmit={(event) => {
                event.preventDefault();
                if (!busy)
                  void sendInvitation({
                    email: email.trim(),
                    jobTitle: jobTitle.trim(),
                    role,
                  });
              }}
            >
              <Typography variant="h6">Пригласить сотрудника</Typography>
              <TextField
                label="Email сотрудника"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
                required
                size="small"
                fullWidth
              />
              <JobTitleField
                value={jobTitle}
                onChange={setJobTitle}
                disabled={busy}
              />
              <TextField
                select
                label="Роль доступа"
                value={role}
                onChange={(event) => setRole(event.target.value as TeamRole)}
                size="small"
                disabled={busy}
                helperText={
                  role === "MANAGER"
                    ? "Управляет кабинетом исполнителя, услугами и заявками"
                    : "Видит только назначенные ему заявки и их чаты"
                }
              >
                <MenuItem value="EMPLOYEE">Сотрудник</MenuItem>
                <MenuItem value="MANAGER">Менеджер</MenuItem>
              </TextField>
              <Button
                type="submit"
                variant="contained"
                loading={busy}
                disabled={!jobTitle.trim()}
                sx={{ alignSelf: "flex-start" }}
              >
                Отправить приглашение
              </Button>
            </Stack>
          </Paper>
          {data?.teamInvitations?.length ? (
            <Typography variant="h6">Ожидают ответа</Typography>
          ) : null}
          {data?.teamInvitations?.map((invitation) => (
            <Paper
              key={invitation.id}
              variant="outlined"
              sx={{ p: 2 }}
            >
              <Stack spacing={1}>
                <Typography sx={{ overflowWrap: "anywhere" }}>
                  {invitation.email}
                </Typography>
                <Typography variant="body2">
                  {invitation.jobTitle} · {providerRoleLabel(invitation.role)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary" }}
                >
                  {Date.parse(invitation.expiresAt) <= Date.now()
                    ? "Срок приглашения истёк"
                    : `Действует до ${new Date(invitation.expiresAt).toLocaleDateString("ru-RU")}`}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: "wrap" }}
                >
                  <Button
                    size="small"
                    disabled={busy}
                    onClick={() => void sendInvitation(invitation)}
                  >
                    Отправить повторно
                  </Button>
                  <Button
                    size="small"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      try {
                        await teamApi(
                          `/api/providers/${providerId}/invitations/${invitation.id}`,
                          { method: "DELETE" },
                        );
                        await refresh();
                        setSuccess("Приглашение отменено");
                      } catch (reason) {
                        setError(
                          reason instanceof Error
                            ? reason.message
                            : "Не удалось отменить приглашение",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Отменить приглашение
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </>
      ) : null}
    </Stack>
  );
}
