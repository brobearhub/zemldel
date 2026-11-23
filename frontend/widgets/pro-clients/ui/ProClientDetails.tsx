"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  clientStatusLabels,
  type ProviderClientDetail,
} from "@/entities/provider-client/model";
import { writeClientData } from "@/entities/provider-client/api";
import {
  formatRequestDate,
  getRequestStatusLabel,
  PROVIDER_WORK_LABELS,
} from "@/entities/request";
import { teamApi } from "@/shared/lib/team-api";
import { useVisibleRefresh } from "@/shared/lib/use-visible-refresh";
import { useConfirm } from "@/shared/ui/confirm";
import { ClientEditor } from "./ClientEditor";

export function ProClientDetails({
  client: initialClient,
}: {
  client: ProviderClientDetail;
}) {
  const router = useRouter();
  const [client, setClient] = useState(initialClient);
  const [refreshState, setRefreshState] = useState<
    "ready" | "checking" | "failed"
  >("ready");
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [invitation, setInvitation] = useState<{
    url: string;
    version: string;
    expiresAt: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const status = client.status;
  const detailPath = `/api/pro/clients/${client.id}`;
  const endpoint = detailPath + "/invitation";
  const refresh = useVisibleRefresh({
    scope: client.id,
    paused: busy,
    refreshAt: client.invitationExpiresAt,
    onRefresh: async (signal) => {
      setRefreshState("checking");
      try {
        const next = await teamApi<ProviderClientDetail>(detailPath, {
          signal,
        });
        if (signal.aborted) return;
        setClient(next);
        setRefreshState("ready");
      } catch {
        if (!signal.aborted) setRefreshState("failed");
      }
    },
  });
  const showInvitation =
    refreshState === "ready" &&
    invitation &&
    status === "INVITED" &&
    invitation.version === client.invitationVersion;

  async function copyInvitation() {
    if (!invitation || busy) return;
    setBusy(true);
    setError("");
    try {
      const current = await teamApi<ProviderClientDetail>(detailPath);
      setClient(current);
      if (current.status === "CONNECTED") {
        setInvitation(null);
        return;
      }
      if (
        current.status !== "INVITED" ||
        current.invitationVersion !== invitation.version
      ) {
        setInvitation(null);
        setError("Эта ссылка больше не действует.");
        return;
      }
      try {
        await navigator.clipboard.writeText(invitation.url);
        setCopied(true);
      } catch {
        setError("Выделите ссылку и скопируйте её вручную.");
      }
    } catch (cause) {
      setRefreshState("failed");
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось проверить приглашение.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeInvitation(revoke = false) {
    if (busy) return;
    if (
      status === "INVITED" &&
      !(await confirm({
        title: revoke ? "Отозвать приглашение?" : "Заменить ссылку?",
        description: "Старая ссылка перестанет действовать.",
        confirmText: revoke ? "Отозвать" : "Заменить",
      }))
    )
      return;
    setBusy(true);
    setError("");
    try {
      if (revoke) {
        await writeClientData(endpoint, "DELETE");
        setInvitation(null);
        setClient((current) => ({
          ...current,
          status: "CONTACT",
          invitationVersion: null,
          invitationExpiresAt: null,
        }));
      } else {
        const result = await writeClientData<{
          path: string;
          version: string;
          expiresAt: string;
        }>(endpoint, "POST");
        setInvitation({
          url: new URL(result.path, window.location.origin).href,
          version: result.version,
          expiresAt: result.expiresAt,
        });
        setClient((current) => ({
          ...current,
          status: "INVITED",
          invitationVersion: result.version,
          invitationExpiresAt: result.expiresAt,
        }));
        setRefreshState("ready");
      }
      setCopied(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось изменить приглашение",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Typography component={Link} href="/pro/clients" variant="body2">
        Все клиенты
      </Typography>
      <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
        <Typography
          component="h1"
          variant="h1"
          sx={{ overflowWrap: "anywhere" }}
        >
          {client.name || client.email}
        </Typography>
        {client.name && (
          <Typography sx={{ overflowWrap: "anywhere" }}>
            {client.email}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {client.source === "CONTRACT"
            ? "Добавлен после заключения договора"
            : "Добавлен командой"}{" "}
          · {formatRequestDate(client.createdAt)}
        </Typography>
        <Chip
          label={clientStatusLabels[status]}
          size="small"
          color={status === "CONNECTED" ? "success" : "default"}
        />
      </Stack>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap" }}
      >
        <Button
          component={Link}
          href={`/pro/requests/new?clientId=${client.id}`}
          variant="contained"
        >
          Создать заявку
        </Button>
        {status !== "CONNECTED" && (
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => void changeInvitation()}
          >
            {status === "INVITED"
              ? "Создать новую ссылку"
              : "Пригласить в кабинет"}
          </Button>
        )}
        <Button disabled={busy} onClick={() => setEditing(true)}>
          Редактировать
        </Button>
        {status === "INVITED" && (
          <Button
            color="error"
            disabled={busy}
            onClick={() => void changeInvitation(true)}
          >
            Отозвать приглашение
          </Button>
        )}
      </Stack>
      {refreshState === "failed" && (
        <Alert
          severity="warning"
          action={<Button onClick={refresh}>Повторить</Button>}
        >
          Не удалось обновить карточку клиента.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {showInvitation && invitation && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
            <Typography>
              Отправьте ссылку клиенту. Она действует до{" "}
              {formatRequestDate(invitation.expiresAt)}.
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Ссылка для клиента"
              value={invitation.url}
              slotProps={{ input: { readOnly: true } }}
              onFocus={(event) => event.target.select()}
            />
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => void copyInvitation()}
            >
              {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
            </Button>
          </Stack>
        </Paper>
      )}
      <Typography component="h2" variant="h5">
        Заявки клиента
      </Typography>
      {client.requests.length === 0 && (
        <Typography color="text.secondary">
          У клиента пока нет заявок.
        </Typography>
      )}
      {client.requests.map((item) => (
        <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
            <Typography
              component={Link}
              href={`/pro/requests/${item.id}`}
              variant="h6"
              sx={{ color: "text.primary", overflowWrap: "anywhere" }}
            >
              {item.serviceTitle ||
                item.message ||
                (item.number ? `Заявка №${item.number}` : "Заявка")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatRequestDate(item.createdAt)} ·{" "}
              {getRequestStatusLabel(item.status)}
            </Typography>
            {item.providerWorkStatus && (
              <Chip
                size="small"
                variant="outlined"
                label={PROVIDER_WORK_LABELS[item.providerWorkStatus]}
              />
            )}
          </Stack>
        </Paper>
      ))}
      {editing && (
        <ClientEditor
          client={client}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            if (next.email !== client.email) {
              setInvitation(null);
            }
            setClient((current) => ({ ...current, ...next }));
            setEditing(false);
            setError("");
            refresh();
            router.refresh();
          }}
        />
      )}
    </Stack>
  );
}
