"use client";

import { useState } from "react";
import { Alert, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import {
  ContractRichEditor,
  normalizeContractEditorContent,
  type ContractEditorContent,
} from "@/widgets/pro-contracts/ui/ContractRichEditor";

type ContractBlockRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  content: unknown;
  version: number;
};

export function AdminContractBlocksClient({ initialBlocks }: { initialBlocks: ContractBlockRow[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selected, setSelected] = useState<ContractBlockRow | null>(initialBlocks[0] ?? null);
  const [title, setTitle] = useState(selected?.title ?? "");
  const [category, setCategory] = useState(selected?.category ?? "");
  const [description, setDescription] = useState(selected?.description ?? "");
  const [content, setContent] = useState<ContractEditorContent>(() => normalizeContractEditorContent(selected?.content));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/contracts/blocks");
    if (!res.ok) throw new Error("Не удалось обновить блоки");
    const rows = (await res.json()) as ContractBlockRow[];
    setBlocks(rows);
  }

  function open(row: ContractBlockRow) {
    setSelected(row);
    setTitle(row.title);
    setCategory(row.category ?? "");
    setDescription(row.description ?? "");
    setContent(normalizeContractEditorContent(row.content));
  }

  function createNew() {
    setSelected(null);
    setTitle("");
    setCategory("");
    setDescription("");
    setContent(normalizeContractEditorContent(null));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const url = selected ? `/api/admin/contracts/blocks/${selected.id}` : "/api/admin/contracts/blocks";
      const method = selected ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, category, description, content }),
      });
      const payload = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Не удалось сохранить блок");
      await refresh();
      setNotice("Блок сохранён");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось сохранить блок");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: ContractBlockRow["status"]) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/contracts/blocks/${selected.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Не удалось обновить статус");
      await refresh();
      setSelected((row) => (row ? { ...row, status } : row));
      setNotice("Статус обновлён");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось обновить статус");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack direction={{ xs: "column", lg: "row" }} spacing={3} sx={{
      alignItems: "flex-start"
    }}>
      <Paper variant="outlined" sx={{ p: 2, width: { xs: "100%", lg: 340 } }}>
        <Stack spacing={1.5}>
          <Button variant="contained" onClick={createNew}>Новый блок</Button>
          {blocks.map((block) => (
            <Paper key={block.id} variant="outlined" sx={{ p: 1.5, cursor: "pointer" }} onClick={() => open(block)}>
              <Stack spacing={0.5}>
                <Typography sx={{
                  fontWeight: 800
                }}>{block.title}</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={block.status} />
                  <Chip size="small" label={`v${block.version}`} />
                </Stack>
                {block.category ? <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>{block.category}</Typography> : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Stack spacing={2} sx={{ flex: 1, width: "100%" }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {notice ? <Alert severity="success">{notice}</Alert> : null}

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="h5" sx={{
              fontWeight: 800
            }}>{selected ? "Редактирование блока" : "Новый блок договора"}</Typography>
            <TextField label="Название" value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} fullWidth required />
            <TextField label="Категория" value={category} onChange={(event) => setCategory(event.target.value)} disabled={busy} fullWidth />
            <TextField label="Описание" value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy} fullWidth multiline minRows={2} />
            <Stack direction="row" spacing={1} useFlexGap sx={{
              flexWrap: "wrap"
            }}>
              <Button variant="contained" disabled={busy || title.trim().length < 2} onClick={() => void save()}>Сохранить</Button>
              {selected ? <Button variant="outlined" disabled={busy} onClick={() => void setStatus("PUBLISHED")}>Опубликовать</Button> : null}
              {selected ? <Button variant="outlined" disabled={busy} onClick={() => void setStatus("ARCHIVED")}>В архив</Button> : null}
            </Stack>
          </Stack>
        </Paper>

        <ContractRichEditor value={content} editable={!busy} onChange={setContent} />
      </Stack>
    </Stack>
  );
}
