"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";

export type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

export type ServiceTemplateRow = {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  paletteColor: string | null;
  icon: string | null;
};

function normalizeNullableString(v: string): string | null {
  const s = v.trim();
  return s.length ? s : null;
}

type Props = {
  initialCategories: ServiceCategoryRow[];
  initialTemplates: ServiceTemplateRow[];
};

export function ServiceTemplatesAdminClient({ initialCategories, initialTemplates }: Props) {
  const [categories, setCategories] = useState<ServiceCategoryRow[]>(initialCategories);
  const [templates, setTemplates] = useState<ServiceTemplateRow[]>(initialTemplates);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const [createForm, setCreateForm] = useState<{
    categoryId: string;
    title: string;
    description: string;
    paletteColor: string;
    icon: string;
  }>({
    categoryId: categories[0]?.id ?? "",
    title: "",
    description: "",
    paletteColor: "",
    icon: "",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<ServiceTemplateRow | null>(null);

  async function refresh() {
    const [catRes, tplRes] = await Promise.all([
      fetch("/api/admin/service-categories"),
      fetch("/api/admin/service-templates"),
    ]);
    if (!catRes.ok) throw new Error("Failed to fetch categories");
    if (!tplRes.ok) throw new Error("Failed to fetch templates");
    setCategories((await catRes.json()) as ServiceCategoryRow[]);
    setTemplates((await tplRes.json()) as ServiceTemplateRow[]);
  }

  async function onCreate() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/service-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: createForm.categoryId,
          title: createForm.title,
          description: normalizeNullableString(createForm.description),
          paletteColor: normalizeNullableString(createForm.paletteColor),
          icon: normalizeNullableString(createForm.icon),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to create template");
      }
      setCreateForm((s) => ({ ...s, title: "", description: "" }));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(row: ServiceTemplateRow) {
    setEditDraft({ ...row });
    setEditOpen(true);
  }

  async function onSaveEdit() {
    if (!editDraft) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/service-templates/${editDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: editDraft.categoryId,
          title: editDraft.title,
          description: editDraft.description,
          paletteColor: editDraft.paletteColor,
          icon: editDraft.icon,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to patch template");
      }
      setEditOpen(false);
      setEditDraft(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: Pick<ServiceTemplateRow, "id" | "title">) {
    if (!confirm(`Удалить шаблон "${row.title}"?`)) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/service-templates/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to delete template");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={3}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Создать шаблон</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
          <TextField
            select
            label="category"
            value={createForm.categoryId}
            onChange={(e) => setCreateForm((s) => ({ ...s, categoryId: e.target.value }))}
            size="small"
            sx={{ minWidth: 260 }}
          >
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name} ({c.slug})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="title"
            value={createForm.title}
            onChange={(e) => setCreateForm((s) => ({ ...s, title: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label="description (optional)"
            value={createForm.description}
            onChange={(e) => setCreateForm((s) => ({ ...s, description: e.target.value }))}
            size="small"
            fullWidth
          />
          <Button
            variant="contained"
            onClick={onCreate}
            disabled={busy}
            sx={{ whiteSpace: "nowrap", fontWeight: 800 }}
          >
            Создать
          </Button>
        </Stack>
      </Box>

      <Box>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Список шаблонов ({templates.length})</Typography>
        <Stack spacing={1}>
          {templates.map((t) => {
            const c = categoriesById.get(t.categoryId) ?? null;
            return (
              <Stack
                key={t.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "flex-start", sm: "center" }}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800 }}>{t.title}</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {c ? `${c.name} (${c.slug})` : `categoryId: ${t.categoryId}`}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => openEdit(t)} disabled={busy}>
                    Редактировать
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => onDelete({ id: t.id, title: t.title })}
                    disabled={busy}
                  >
                    Удалить
                  </Button>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Редактировать шаблон</DialogTitle>
        <DialogContent>
          {editDraft ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="id" value={editDraft.id} size="small" disabled />
              <TextField
                select
                label="category"
                value={editDraft.categoryId}
                onChange={(e) => setEditDraft((s) => (s ? { ...s, categoryId: e.target.value } : s))}
                size="small"
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="title"
                value={editDraft.title}
                onChange={(e) => setEditDraft((s) => (s ? { ...s, title: e.target.value } : s))}
                size="small"
                fullWidth
              />
              <TextField
                label="description (null = empty)"
                value={editDraft.description ?? ""}
                onChange={(e) =>
                  setEditDraft((s) => (s ? { ...s, description: normalizeNullableString(e.target.value) } : s))
                }
                size="small"
                fullWidth
                multiline
                minRows={3}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="paletteColor (null = empty)"
                  value={editDraft.paletteColor ?? ""}
                  onChange={(e) =>
                    setEditDraft((s) =>
                      s ? { ...s, paletteColor: normalizeNullableString(e.target.value) } : s
                    )
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="icon (null = empty)"
                  value={editDraft.icon ?? ""}
                  onChange={(e) =>
                    setEditDraft((s) => (s ? { ...s, icon: normalizeNullableString(e.target.value) } : s))
                  }
                  size="small"
                  fullWidth
                />
              </Stack>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={busy}>
            Отмена
          </Button>
          <Button variant="contained" onClick={onSaveEdit} disabled={busy}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

