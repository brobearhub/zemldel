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
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ServiceDto } from "@/entities/service";
import { useConfirm } from "@/shared/ui/confirm";

type ServiceRow = ServiceDto;

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

type Props = {
  mode: "create" | "list";
  initialServices?: ServiceRow[];
};

function normalizeNullableString(v: string): string | null {
  const s = v.trim();
  return s.length ? s : null;
}

function normalizePaletteColor(v: string): ServiceDto["paletteColor"] {
  const s = normalizeNullableString(v);
  if (!s) return null;
  const allowed = ["primary", "secondary", "info", "success", "warning", "error"] as const;
  return (allowed as readonly string[]).includes(s) ? (s as ServiceDto["paletteColor"]) : null;
}

function normalizeIcon(v: string): ServiceDto["icon"] {
  const s = normalizeNullableString(v);
  if (!s) return null;
  const allowed = ["map", "electric", "architecture"] as const;
  return (allowed as readonly string[]).includes(s) ? (s as ServiceDto["icon"]) : null;
}

export function ServicesAdminClient({ mode, initialServices }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [services, setServices] = useState<ServiceRow[]>(initialServices ?? []);
  const [categories, setCategories] = useState<ServiceCategoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [createForm, setCreateForm] = useState<{
    categoryId: string;
    title: string;
    price: string;
    ctaText: string;
    ctaHref: string;
  }>({
    categoryId: "",
    title: "",
    price: "",
    ctaText: "Записаться",
    ctaHref: "#contacts",
  });

  useEffect(() => {
    fetch("/api/admin/service-categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json() as Promise<ServiceCategoryRow[]>;
      })
      .then((data) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (categories && !createForm.categoryId) {
      const main = categories.find((c) => c.slug === "main") ?? null;
      const fallback = main ?? categories[0] ?? null;
      if (fallback) {
        setCreateForm((s) => ({ ...s, categoryId: fallback.id }));
      }
    }
  }, [categories, createForm.categoryId]);

  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<ServiceRow | null>(null);

  const grouped = useMemo(() => {
    const main = services.filter((s) => s.category?.slug === "main");
    const legal = services.filter((s) => s.category?.slug === "legal");
    return { main, legal };
  }, [services]);

  async function refresh() {
    const res = await fetch("/api/admin/services");
    if (!res.ok) throw new Error("Failed to fetch services");
    const data = (await res.json()) as ServiceRow[];
    setServices(data);
  }

  async function onCreate() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          ctaHref: normalizeNullableString(createForm.ctaHref),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Failed to create service");
      }
      setCreateForm((s) => ({ ...s, title: "", price: "" }));
      if (mode === "list") {
        await refresh();
      } else {
        router.push("/admin/services/list");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(row: ServiceRow) {
    setEditDraft({ ...row });
    setEditOpen(true);
  }

  async function onSaveEdit() {
    if (!editDraft) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/services/${editDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: editDraft.categoryId,
          title: editDraft.title,
          price: editDraft.price,
          ctaText: editDraft.ctaText,
          ctaHref: editDraft.ctaHref,
          image: editDraft.image,
          description: editDraft.description,
          highlight: editDraft.highlight,
          badge: editDraft.badge,
          stockBadge: editDraft.stockBadge,
          paletteColor: editDraft.paletteColor,
          icon: editDraft.icon,
          rating: editDraft.rating,
          reviewCount: editDraft.reviewCount,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Failed to update service");
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

  async function onDelete(service: Pick<ServiceRow, "id" | "title">) {
    const ok = await confirm({
      title: `Удалить услугу "${service.title}"?`,
      description: "Это действие нельзя отменить.",
      confirmText: "Удалить",
      confirmColor: "error",
    });
    if (!ok) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete service");
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

      {mode === "create" ? (
      <Box>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{
          alignItems: "flex-start"
        }}>
          <TextField
            select
            id="create-service-category"
            label="category"
            value={createForm.categoryId}
            onChange={(e) =>
              setCreateForm((s) => ({
                ...s,
                categoryId: e.target.value,
              }))
            }
            size="small"
            sx={{ minWidth: 160 }}
          >
            {(categories ?? []).map((c) => (
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
            label="price"
            value={createForm.price}
            onChange={(e) => setCreateForm((s) => ({ ...s, price: e.target.value }))}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="ctaText"
            value={createForm.ctaText}
            onChange={(e) => setCreateForm((s) => ({ ...s, ctaText: e.target.value }))}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="ctaHref"
            value={createForm.ctaHref}
            onChange={(e) => setCreateForm((s) => ({ ...s, ctaHref: e.target.value }))}
            size="small"
            sx={{ minWidth: 180 }}
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
      ) : null}

      {mode === "list" ? (
      <Box>
        <Stack spacing={2}>
          <Box>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>main ({grouped.main.length})</Typography>
            <Stack spacing={1}>
              {grouped.main.map((s) => (
                <Stack
                  key={s.id}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{
                    alignItems: { xs: "flex-start", sm: "center" },
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1
                  }}>
                  <Typography sx={{ flex: 1 }}>{s.title}</Typography>
                  <Typography sx={{ fontWeight: 700, minWidth: 120 }}>{s.price}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => openEdit(s)} disabled={busy}>
                      Редактировать
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => onDelete({ id: s.id, title: s.title })}
                      disabled={busy}
                    >
                      Удалить
                    </Button>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>legal ({grouped.legal.length})</Typography>
            <Stack spacing={1}>
              {grouped.legal.map((s) => (
                <Stack
                  key={s.id}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{
                    alignItems: { xs: "flex-start", sm: "center" },
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1
                  }}>
                  <Typography sx={{ flex: 1 }}>{s.title}</Typography>
                  <Typography sx={{ fontWeight: 700, minWidth: 120 }}>{s.price}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => openEdit(s)} disabled={busy}>
                      Редактировать
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => onDelete({ id: s.id, title: s.title })}
                      disabled={busy}
                    >
                      Удалить
                    </Button>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
      ) : null}

      {mode === "list" ? (
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Редактировать услугу</DialogTitle>
        <DialogContent>
          {editDraft ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="id" value={editDraft.id} size="small" disabled />
              <TextField
                select
                id="edit-service-category"
                label="category"
                value={editDraft.categoryId}
                onChange={(e) =>
                  setEditDraft((s) => (s ? { ...s, categoryId: e.target.value } : s))
                }
                size="small"
              >
                {(categories ?? []).map((c) => (
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
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="price"
                  value={editDraft.price}
                  onChange={(e) => setEditDraft((s) => (s ? { ...s, price: e.target.value } : s))}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="ctaText"
                  value={editDraft.ctaText}
                  onChange={(e) => setEditDraft((s) => (s ? { ...s, ctaText: e.target.value } : s))}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="ctaHref (null = empty)"
                  value={editDraft.ctaHref ?? ""}
                  onChange={(e) =>
                    setEditDraft((s) =>
                      s ? { ...s, ctaHref: normalizeNullableString(e.target.value) } : s
                    )
                  }
                  size="small"
                  fullWidth
                />
              </Stack>

              <TextField
                label="image (null = empty)"
                value={editDraft.image ?? ""}
                onChange={(e) =>
                  setEditDraft((s) => (s ? { ...s, image: normalizeNullableString(e.target.value) } : s))
                }
                size="small"
                fullWidth
              />
              <TextField
                label="stockBadge (null = empty)"
                value={editDraft.stockBadge ?? ""}
                onChange={(e) =>
                  setEditDraft((s) =>
                    s ? { ...s, stockBadge: normalizeNullableString(e.target.value) } : s
                  )
                }
                size="small"
                fullWidth
              />
              <TextField
                label="badge (null = empty)"
                value={editDraft.badge ?? ""}
                onChange={(e) =>
                  setEditDraft((s) => (s ? { ...s, badge: normalizeNullableString(e.target.value) } : s))
                }
                size="small"
                fullWidth
              />
              <TextField
                label="highlight (null = empty)"
                value={editDraft.highlight ?? ""}
                onChange={(e) =>
                  setEditDraft((s) =>
                    s ? { ...s, highlight: normalizeNullableString(e.target.value) } : s
                  )
                }
                size="small"
                fullWidth
              />
              <TextField
                label="description (null = empty)"
                value={editDraft.description ?? ""}
                onChange={(e) =>
                  setEditDraft((s) =>
                    s ? { ...s, description: normalizeNullableString(e.target.value) } : s
                  )
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
                      s ? { ...s, paletteColor: normalizePaletteColor(e.target.value) } : s
                    )
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="icon (null = empty)"
                  value={editDraft.icon ?? ""}
                  onChange={(e) =>
                    setEditDraft((s) => (s ? { ...s, icon: normalizeIcon(e.target.value) } : s))
                  }
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="rating (null = empty)"
                  value={editDraft.rating ?? ""}
                  onChange={(e) =>
                    setEditDraft((s) => {
                      if (!s) return s;
                      const raw = e.target.value.trim();
                      if (!raw) return { ...s, rating: null };
                      const n = Number(raw);
                      return { ...s, rating: Number.isFinite(n) ? n : s.rating };
                    })
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="reviewCount (null = empty)"
                  value={editDraft.reviewCount ?? ""}
                  onChange={(e) =>
                    setEditDraft((s) => {
                      if (!s) return s;
                      const raw = e.target.value.trim();
                      if (!raw) return { ...s, reviewCount: null };
                      const n = Number(raw);
                      return { ...s, reviewCount: Number.isFinite(n) ? Math.trunc(n) : s.reviewCount };
                    })
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
      ) : null}
    </Stack>
  );
}

