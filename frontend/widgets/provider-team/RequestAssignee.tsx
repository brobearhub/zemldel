"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import type { RequestAssignedMemberDto } from "@/entities/request/dto/request.dto";
import { teamApi } from "@/shared/lib/team-api";
import type {
  ProviderMembersResponse,
  ProviderMemberRecord,
} from "./ProviderTeamManagement";

export function RequestAssignee({
  providerName,
  member,
}: {
  providerName?: string | null;
  member?: RequestAssignedMemberDto | null;
}) {
  if (!providerName && !member) return null;
  return (
    <Stack spacing={0.5}>
      {providerName ? (
        <Typography sx={{ fontWeight: 600 }}>
          Исполнитель: {providerName}
        </Typography>
      ) : null}
      {member ? (
        <Typography variant="body2">
          Сотрудник:{" "}
          {[member.jobTitle, member.name].filter(Boolean).join(" · ")}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function RequestAssignment({
  requestId,
  providerId,
  providerName,
  member,
  onChange,
}: {
  requestId: string;
  providerId: string | null;
  providerName?: string | null;
  member?: RequestAssignedMemberDto | null;
  onChange: (member: RequestAssignedMemberDto | null) => void;
}) {
  const membership = useAppSelector((state) =>
    getActiveMembership(state.auth.user),
  );
  const [editing, setEditing] = useState(false);
  const [members, setMembers] = useState<ProviderMemberRecord[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAssign =
    providerId &&
    membership?.providerId === providerId &&
    (membership.role === "OWNER" || membership.role === "MANAGER");
  if (!canAssign && !member) return null;
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <RequestAssignee
          providerName={providerName}
          member={member}
        />
        {error ? <Alert severity="error">{error}</Alert> : null}
        {canAssign && !editing ? (
          <Button
            size="small"
            variant="text"
            loading={busy}
            sx={{
              alignSelf: "flex-start",
              color: "text.primary",
            }}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const data = await teamApi<ProviderMembersResponse>(
                  `/api/providers/${providerId}/members`,
                );
                setMembers(
                  data.members.filter((item) => item.status === "ACTIVE"),
                );
                setValue(member?.id ?? "");
                setEditing(true);
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Не удалось загрузить команду",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {member ? "Изменить сотрудника" : "Назначить сотрудника"}
          </Button>
        ) : null}
        {canAssign && editing ? (
          <Stack spacing={1.5}>
            <TextField
              select
              label="Сотрудник"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              size="small"
              fullWidth
              disabled={busy}
            >
              <MenuItem value="">Без назначения</MenuItem>
              {members.map((item) => (
                <MenuItem
                  key={item.id}
                  value={item.id}
                  sx={{ whiteSpace: "normal" }}
                >
                  {[item.jobTitle, item.user.name || item.user.email]
                    .filter(Boolean)
                    .join(" · ")}
                </MenuItem>
              ))}
            </TextField>
            <Stack
              direction="row"
              spacing={1}
            >
              <Button
                variant="contained"
                size="small"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const data = await teamApi<{
                      assignedMember: RequestAssignedMemberDto | null;
                    }>(`/api/pro/requests/${requestId}/assignee`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ memberId: value || null }),
                    });
                    onChange(data.assignedMember);
                    setEditing(false);
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Не удалось назначить сотрудника",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Сохранить
              </Button>
              <Button
                size="small"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Отмена
              </Button>
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
