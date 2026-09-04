"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useConfirm } from "@/shared/ui/confirm";

export type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
  placements: Array<"HOME">;
};

function normalizeNullableString(v: string): string | null {
  const s = v.trim();
  return s.length ? s : null;
}

function normalizeNullableInt(v: string): number | null {
  const s = v.trim();
  if (!s.length) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function buildTree(categories: ServiceCategoryRow[]) {
  const byParent = new Map<string | null, ServiceCategoryRow[]>();
  for (const c of categories) {
    const key = c.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(c);
    byParent.set(key, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => {
      const soA = a.sortOrder ?? 0;
      const soB = b.sortOrder ?? 0;
      if (soA !== soB) return soA - soB;
      return a.name.localeCompare(b.name);
    });
  }

  const out: Array<{ node: ServiceCategoryRow; depth: number }> = [];
  const walk = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      out.push({ node: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

type Props = {
  initialCategories: ServiceCategoryRow[];
};

export function ServiceCategoriesAdminClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<ServiceCategoryRow[]>(initialCategories);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const [createForm, setCreateForm] = useState<{
    name: string;
    slug: string;
    parentId: string;
    sortOrder: string;
    showOnHome: boolean;
  }>({
    name: "",
    slug: "",
    parentId: "",
    sortOrder: "",
    showOnHome: false,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<ServiceCategoryRow | null>(null);
  const [editParentDraft, setEditParentDraft] = useState<string>("");
  const [editSortOrderDraft, setEditSortOrderDraft] = useState<string>("");
  const [editShowOnHomeDraft, setEditShowOnHomeDraft] = useState<boolean>(false);

  const flatTree = useMemo(() => buildTree(categories), [categories]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  async function refresh() {
    const res = await fetch("/api/admin/service-categories");
    if (!res.ok) throw new Error("Failed to fetch categories");
    const data = (await res.json()) as ServiceCategoryRow[];
    setCategories(data);
  }

  async function onCreate() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/service-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          slug: createForm.slug,
          parentId: normalizeNullableString(createForm.parentId),
          sortOrder: normalizeNullableInt(createForm.sortOrder),
          placements: createForm.showOnHome ? ["HOME"] : [],
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to create category");
      }
      setCreateForm({ name: "", slug: "", parentId: "", sortOrder: "", showOnHome: false });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(row: ServiceCategoryRow) {
    setEditDraft({ ...row });
    setEditParentDraft(row.parentId ?? "");
    setEditSortOrderDraft(row.sortOrder === null ? "" : String(row.sortOrder));
    setEditShowOnHomeDraft(row.placements.includes("HOME"));
    setEditOpen(true);
  }

  async function onSaveEdit() {
    if (!editDraft) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/service-categories/${editDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name,
          slug: editDraft.slug,
          parentId: normalizeNullableString(editParentDraft),
          sortOrder: normalizeNullableInt(editSortOrderDraft),
          placements: editShowOnHomeDraft ? ["HOME"] : [],
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to patch category");
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

  async function onDelete(row: Pick<ServiceCategoryRow, "id" | "name">) {
    const ok = await confirm({
      title: `Удалить категорию "${row.name}"?`,
      description: "Это действие нельзя отменить.",
      confirmText: "Удалить",
      confirmColor: "error",
    });
    if (!ok) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/service-categories/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to delete category");
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
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Создать категорию</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{
          alignItems: "flex-start"
        }}>
          <TextField
            label="name"
            value={createForm.name}
            onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label="slug"
            value={createForm.slug}
            onChange={(e) => setCreateForm((s) => ({ ...s, slug: e.target.value }))}
            size="small"
            sx={{ minWidth: 180 }}
          />
          <TextField
            select
            label="parent (optional)"
            value={createForm.parentId}
            onChange={(e) => setCreateForm((s) => ({ ...s, parentId: e.target.value }))}
            size="small"
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="">(root)</MenuItem>
            {flatTree.map(({ node, depth }) => (
              <MenuItem key={node.id} value={node.id}>
                {"—".repeat(depth)} {node.name} ({node.slug})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="sortOrder (optional)"
            value={createForm.sortOrder}
            onChange={(e) => setCreateForm((s) => ({ ...s, sortOrder: e.target.value }))}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={createForm.showOnHome}
                onChange={(e) => setCreateForm((s) => ({ ...s, showOnHome: e.target.checked }))}
              />
            }
            label="Показывать на главной"
            sx={{ mt: { xs: 0, md: 0.5 } }}
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
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Дерево категорий</Typography>
        <Stack spacing={1}>
          {flatTree.map(({ node, depth }) => {
            const parent = node.parentId ? categoriesById.get(node.parentId) : null;
            return (
              <Stack
                key={node.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{
                  alignItems: { xs: "flex-start", sm: "center" },
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1
                }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800 }}>
                    {"—".repeat(depth)} {node.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    slug: {node.slug}
                    {parent ? ` · parent: ${parent.slug}` : ""}
                    {node.sortOrder !== null ? ` · sort: ${node.sortOrder}` : ""}
                  </Typography>
                  {node.placements.includes("HOME") ? (
                    <Box sx={{ mt: 1 }}>
                      <Chip size="small" label="HOME" color="primary" variant="outlined" />
                    </Box>
                  ) : null}
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => openEdit(node)} disabled={busy}>
                    Редактировать
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => onDelete({ id: node.id, name: node.name })}
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
        <DialogTitle>Редактировать категорию</DialogTitle>
        <DialogContent>
          {editDraft ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="id" value={editDraft.id} size="small" disabled />
              <TextField
                label="name"
                value={editDraft.name}
                onChange={(e) => setEditDraft((s) => (s ? { ...s, name: e.target.value } : s))}
                size="small"
              />
              <TextField
                label="slug"
                value={editDraft.slug}
                onChange={(e) => setEditDraft((s) => (s ? { ...s, slug: e.target.value } : s))}
                size="small"
              />
              <TextField
                select
                label="parent"
                value={editParentDraft}
                onChange={(e) => setEditParentDraft(e.target.value)}
                size="small"
              >
                <MenuItem value="">(root)</MenuItem>
                {flatTree
                  .filter(({ node }) => node.id !== editDraft.id)
                  .map(({ node, depth }) => (
                    <MenuItem key={node.id} value={node.id}>
                      {"—".repeat(depth)} {node.name} ({node.slug})
                    </MenuItem>
                  ))}
              </TextField>
              <TextField
                label="sortOrder (optional)"
                value={editSortOrderDraft}
                onChange={(e) => setEditSortOrderDraft(e.target.value)}
                size="small"
              />
              <FormControlLabel
                control={<Checkbox checked={editShowOnHomeDraft} onChange={(e) => setEditShowOnHomeDraft(e.target.checked)} />}
                label="Показывать на главной"
              />
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

