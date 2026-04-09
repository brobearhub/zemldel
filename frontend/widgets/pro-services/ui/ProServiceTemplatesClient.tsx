"use client";

import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

type ServiceTemplateRow = {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  paletteColor: string | null;
  icon: string | null;
  isAdded: boolean;
};

type Props = {
  initialCategories: ServiceCategoryRow[];
  initialTemplates: ServiceTemplateRow[];
};

export function ProServiceTemplatesClient({ initialCategories, initialTemplates }: Props) {
  const router = useRouter();
  const [categories] = useState<ServiceCategoryRow[]>(initialCategories);
  const [templates, setTemplates] = useState<ServiceTemplateRow[]>(initialTemplates);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, ServiceTemplateRow[]>();
    for (const t of templates) {
      const arr = byCategory.get(t.categoryId) ?? [];
      arr.push(t);
      byCategory.set(t.categoryId, arr);
    }
    for (const arr of byCategory.values()) {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    }

    const categoriesSorted = [...categories].sort((a, b) => {
      const soA = a.sortOrder ?? 0;
      const soB = b.sortOrder ?? 0;
      if (soA !== soB) return soA - soB;
      return a.name.localeCompare(b.name);
    });

    return categoriesSorted
      .map((c) => ({ category: c, items: byCategory.get(c.id) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [categories, templates]);

  async function refresh() {
    const res = await fetch("/api/pro/service-templates");
    if (!res.ok) throw new Error("Failed to fetch templates");
    setTemplates((await res.json()) as ServiceTemplateRow[]);
  }

  async function onAdd(template: Pick<ServiceTemplateRow, "id" | "title">) {
    setError(null);
    setBusyId(template.id);
    try {
      const res = await fetch("/api/pro/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to create service from template");
      }
      const created = (await res.json().catch(() => null)) as { id?: string } | null;
      await refresh();
      if (created?.id) {
        router.push(`/pro/services/${created.id}/edit`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack spacing={3}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box>
        <Typography sx={{ color: "text.secondary" }}>
          Выберите шаблон — мы создадим черновик услуги в вашем кабинете. Дальше вы сможете настроить цену и описание.
        </Typography>
      </Box>

      <Stack spacing={3}>
        {grouped.map(({ category, items }) => (
          <Box key={category.id}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
              {category.name} ({category.slug})
            </Typography>
            <Stack spacing={1}>
              {items.map((t) => {
                const c = categoriesById.get(t.categoryId);
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
                        {t.description ?? (c ? c.name : "")}
                      </Typography>
                    </Box>
                    {t.isAdded ? (
                      <Button size="small" variant="outlined" disabled>
                        Уже добавлено
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => onAdd({ id: t.id, title: t.title })}
                        disabled={busyId === t.id}
                        sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
                      >
                        Добавить
                      </Button>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

