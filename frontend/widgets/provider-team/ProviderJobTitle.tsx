"use client";

import { useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { JobTitleField } from "@/shared/ui/JobTitleField";

export function ProviderJobTitle({
  value,
  editable,
  onSave,
}: {
  value?: string | null;
  editable: boolean;
  onSave: (title: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!editing)
    return (
      <Stack spacing={0.5}>
        {value ? <Typography>{value}</Typography> : null}
        {editable ? (
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setDraft(value ?? "");
              setError(null);
              setEditing(true);
            }}
            sx={{
              alignSelf: "flex-start",
              color: "text.primary",
            }}
          >
            {value ? "Изменить должность" : "Указать должность"}
          </Button>
        ) : null}
      </Stack>
    );
  return (
    <Stack spacing={1.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <JobTitleField
        value={draft}
        onChange={setDraft}
        disabled={busy}
      />
      <Stack
        direction="row"
        spacing={1}
      >
        <Button
          size="small"
          variant="contained"
          loading={busy}
          disabled={!draft.trim() || draft.trim().length > 120}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onSave(draft.trim());
              setEditing(false);
            } catch {
              setError("Не удалось сохранить должность. Попробуйте ещё раз.");
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
  );
}
