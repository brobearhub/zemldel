"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Autocomplete,
  Button,
  createFilterOptions,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import type { ProviderClient } from "@/entities/provider-client/model";
import { writeClientData } from "@/entities/provider-client/api";
import { CityAutocomplete } from "@/shared/ui/CityAutocomplete";
import { ClientEditor } from "./ClientEditor";

type ServiceOption = { id: string; title: string };

const addClientOption = { id: "add-client", label: "+ Добавить клиента" };
type ClientOption = ProviderClient | typeof addClientOption;
const filterClients = createFilterOptions<ClientOption>();

function getClientOptionLabel(option: ClientOption) {
  if ("label" in option) return option.label;
  return option.name ? `${option.name} · ${option.email}` : option.email;
}

export function PrivateRequestForm({
  clients: initialClients,
  initialClientId,
  services,
}: {
  clients: ProviderClient[];
  initialClientId?: string;
  services: ServiceOption[];
}) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [client, setClient] = useState(
    () => initialClients.find((item) => item.id === initialClientId) ?? null,
  );
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<"free" | "service">("free");
  const [service, setService] = useState<ServiceOption | null>(null);
  const [message, setMessage] = useState("");
  const [city, setCity] = useState<CitySuggestItemDto | null>(null);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent) {
    event.preventDefault();
    if (
      busy ||
      !client ||
      (kind === "service" && !service) ||
      (kind === "free" && !message.trim())
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await writeClientData<{ id: string }>(
        `/api/pro/clients/${client.id}/requests`,
        "POST",
        {
          ...(kind === "service" && service && { serviceId: service.id }),
          ...(message.trim() && { message: message.trim() }),
          ...(city && { requestCityId: city.id }),
          ...(address.trim() && { location: address.trim() }),
        },
        true,
      );
      router.push(`/pro/requests/${result.id}`);
      router.refresh();
    } catch (cause) {
      setBusy(false);
      setError(
        cause instanceof Error ? cause.message : "Не удалось создать заявку",
      );
    }
  }

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
      <Typography
        component={Link}
        href={
          initialClientId
            ? `/pro/clients/${encodeURIComponent(initialClientId)}`
            : "/pro/requests/board"
        }
        variant="body2"
      >
        {initialClientId ? "К карточке клиента" : "К заявкам"}
      </Typography>
      <Typography variant="h1" component="h1">
        Новая заявка для клиента
      </Typography>
      <Paper
        component="form"
        variant="outlined"
        onSubmit={create}
        sx={{ p: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={2.5}>
          <Autocomplete<ClientOption>
            size="small"
            options={clients}
            filterOptions={(options, state) => [
              ...filterClients(options, state),
              addClientOption,
            ]}
            value={client}
            disabled={busy}
            onChange={(_, value) => {
              if (value && "label" in value) {
                setAdding(true);
              } else {
                setClient(value);
              }
            }}
            getOptionLabel={getClientOptionLabel}
            getOptionKey={(option) => option.id}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField {...params} label="Клиент" required />
            )}
          />
          <TextField
            size="small"
            select
            label="Тип заявки"
            value={kind}
            disabled={busy}
            onChange={(e) =>
              setKind(e.target.value === "service" ? "service" : "free")
            }
          >
            <MenuItem value="free">В свободной форме</MenuItem>
            <MenuItem value="service">По моей услуге</MenuItem>
          </TextField>
          {kind === "service" && (
            <Autocomplete
              size="small"
              options={services}
              value={service}
              disabled={busy}
              getOptionLabel={(option) => option.title}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onChange={(_, value) => setService(value)}
              noOptionsText="Нет опубликованных услуг"
              renderInput={(params) => (
                <TextField {...params} label="Услуга" required />
              )}
            />
          )}
          <TextField
            size="small"
            label="Описание работ"
            multiline
            minRows={3}
            required={kind === "free"}
            value={message}
            disabled={busy}
            onChange={(event) => setMessage(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 5000 } }}
          />
          <CityAutocomplete
            label="Город"
            placeholder="Начните вводить название города"
            value={city}
            onChange={setCity}
            disabled={busy}
          />
          <TextField
            size="small"
            label="Адрес места работ"
            placeholder="Улица, дом или ориентир"
            value={address}
            disabled={busy}
            onChange={(event) => setAddress(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          {client && (
            <Alert severity="info">
              {client.status === "CONNECTED"
                ? "Заявка появится в кабинете этого клиента."
                : `Вы можете вести работу уже сейчас. Заявка появится у клиента, когда он войдёт с подтверждённой почтой ${client.email}.`}
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            loading={busy}
            disabled={!client || (kind === "free" ? !message.trim() : !service)}
          >
            Создать заявку
          </Button>
        </Stack>
      </Paper>
      {adding && (
        <ClientEditor
          onCancel={() => setAdding(false)}
          onSave={(next) => {
            setClients((items) => [
              next,
              ...items.filter((item) => item.id !== next.id),
            ]);
            setClient(next);
            setAdding(false);
          }}
        />
      )}
    </Stack>
  );
}
