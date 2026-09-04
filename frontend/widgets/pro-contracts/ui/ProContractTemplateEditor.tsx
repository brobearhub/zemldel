"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import {
  ContractRichEditor,
  normalizeContractEditorContent,
  type ContractBlockOption,
  type ContractEditorContent,
} from "./ContractRichEditor";

export type ContractTemplateDetail = {
  id?: string;
  title: string;
  content: unknown;
  version?: number;
  parentTemplateId?: string | null;
};

type Props = {
  mode: "create" | "edit";
  initial?: ContractTemplateDetail;
};

export function ProContractTemplateEditor({ mode, initial }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [content, setContent] = useState<ContractEditorContent>(() => normalizeContractEditorContent(initial?.content));
  const [blocks, setBlocks] = useState<ContractBlockOption[]>([]);

  useEffect(() => {
    fetch("/api/pro/contracts/blocks")
      .then((res) => (res.ok ? (res.json() as Promise<ContractBlockOption[]>) : []))
      .then((rows) => setBlocks(rows))
      .catch(() => setBlocks([]));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const url =
        mode === "edit" && initial?.id ? `/api/pro/contracts/templates/${initial.id}` : "/api/pro/contracts/templates";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const payload = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok) {
        setError(payload?.error ?? "Не удалось сохранить шаблон");
        return;
      }
      setNotice("Сохранено");
      const id = mode === "edit" ? initial?.id : payload?.id;
      router.push(id ? `/pro/documents/contracts/templates/${id}/edit` : "/pro/documents/contracts");
      router.refresh();
    } catch {
      setError("Не удалось сохранить шаблон");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={3} component="form" onSubmit={save}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>
            {mode === "edit" ? "Редактор шаблона" : "Новый шаблон"}
          </Typography>

          <TextField label="Название" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} fullWidth required />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button type="submit" variant="contained" disabled={busy}>
              Сохранить
            </Button>
            <Button variant="outlined" disabled={busy} onClick={() => router.push("/pro/documents/contracts")}>
              Назад
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <ContractRichEditor value={content} blocks={blocks} editable={!busy} onChange={setContent} />
    </Stack>
  );
}

