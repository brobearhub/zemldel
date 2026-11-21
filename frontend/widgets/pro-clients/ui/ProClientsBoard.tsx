"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import {
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  clientStatusLabels,
  type ProviderClient,
} from "@/entities/provider-client/model";
import {
  formatRequestDate,
  getRequestStatusLabel,
  isOpenRequestStatus,
} from "@/entities/request";
import { ClientEditor } from "./ClientEditor";

export function ProClientsBoard({ clients }: { clients: ProviderClient[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) =>
      [client.name, client.email, ...client.recentServiceTitles].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [clients, search]);
  const orders = clients.reduce((sum, client) => sum + client.ordersCount, 0);
  const repeat = clients.filter((client) => client.ordersCount > 1).length;

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
      >
        <Typography component="h1" variant="h1">
          Клиенты
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddOutlinedIcon />}
          onClick={() => setAdding(true)}
        >
          Добавить клиента
        </Button>
      </Stack>
      {clients.length > 0 ? (
        <>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Chip label={`Клиентов: ${clients.length}`} />
            <Chip label={`Заявок: ${orders}`} />
            <Chip label={`Повторных клиентов: ${repeat}`} />
          </Stack>
          <TextField
            size="small"
            label="Поиск по имени, почте или услуге"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </>
      ) : null}
      {filtered.map((client) => {
        const open = Object.entries(client.statuses).reduce(
          (sum, [status, count]) =>
            sum +
            (isOpenRequestStatus(status as keyof ProviderClient["statuses"])
              ? count
              : 0),
          0,
        );
        return (
          <Paper
            variant="outlined"
            key={client.id}
            sx={{ p: { xs: 2, sm: 2.5 } }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                }}
              >
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  <Typography
                    component={Link}
                    href={`/pro/clients/${client.id}`}
                    variant="h6"
                    sx={{ color: "text.primary", overflowWrap: "anywhere" }}
                  >
                    {client.name || client.email}
                  </Typography>
                  {client.name && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ overflowWrap: "anywhere" }}
                    >
                      {client.email}
                    </Typography>
                  )}
                </Stack>
                <Chip
                  size="small"
                  variant="outlined"
                  color={client.status === "CONNECTED" ? "success" : "default"}
                  label={clientStatusLabels[client.status]}
                />
              </Stack>
              <Typography variant="body2">
                Заявок: {client.ordersCount}
                {open > 0 && ` · Открытых: ${open}`}
                {client.lastOrderAt &&
                  ` · Последняя заявка: ${formatRequestDate(client.lastOrderAt)}`}
              </Typography>
              {client.ordersCount > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {Object.entries(client.statuses)
                    .filter(([, count]) => count > 0)
                    .map(
                      ([status, count]) =>
                        `${getRequestStatusLabel(status as keyof ProviderClient["statuses"])} · ${count}`,
                    )
                    .join(", ")}
                </Typography>
              )}
              {client.recentServiceTitles.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {client.recentServiceTitles.join(", ")}
                </Typography>
              )}
            </Stack>
          </Paper>
        );
      })}
      {!filtered.length && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography>
            {clients.length
              ? "По вашему запросу клиенты не найдены."
              : "Пока нет клиентов. Добавьте первого по email или заключите договор по заявке."}
          </Typography>
        </Paper>
      )}
      {adding && (
        <ClientEditor
          onCancel={() => setAdding(false)}
          onSave={(client) => {
            setAdding(false);
            router.push(`/pro/clients/${client.id}`);
            router.refresh();
          }}
        />
      )}
    </Stack>
  );
}
