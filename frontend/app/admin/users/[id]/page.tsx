import { Button, Paper, Stack, Typography } from "@mui/material";
import { UserLocalDate } from "@/shared/ui/UserLocalDate";
import { PASSPORT_AUDIT_ACTIONS, type PassportAuditPage } from "../model";
import { fetchAdminUsers } from "../server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function UserPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const suffix = query.page ? `?page=${encodeURIComponent(query.page)}` : "";
  const data = await fetchAdminUsers<PassportAuditPage>(
    `/admin/users/${encodeURIComponent(id)}/passport-audit${suffix}`,
  );
  const base = `/admin/users/${encodeURIComponent(data.user.id)}`;

  return (
    <Stack spacing={2}>
      <Button
        component="a"
        href="/admin/users"
        sx={{
          alignSelf: "flex-start",
        }}
      >
        К пользователям
      </Button>
      <Stack spacing={0.5}>
        <Typography
          component="h1"
          variant="h1"
          sx={{
            overflowWrap: "anywhere",
          }}
        >
          {data.user.name?.trim() || data.user.email}
        </Typography>
        <Typography
          color="text.secondary"
          sx={{
            overflowWrap: "anywhere",
          }}
        >
          {data.user.email}
        </Typography>
      </Stack>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{
          justifyContent: "space-between",
          alignItems: { sm: "center" },
        }}
      >
        <Typography
          component="h2"
          variant="h6"
        >
          Журнал доступа к паспорту · {data.total}
        </Typography>
        <Button
          component="a"
          href={`${base}${suffix}`}
        >
          Обновить журнал
        </Button>
      </Stack>
      {data.items.length === 0 ? <Typography>Событий пока нет.</Typography> : null}
      {data.items.map((event) => (
        <Paper
          key={event.id}
          variant="outlined"
          sx={{
            p: 2,
            overflowWrap: "anywhere",
          }}
        >
          <Stack spacing={0.5}>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              <UserLocalDate
                iso={event.createdAt}
                withSeconds
              />
            </Typography>
            <Typography>{PASSPORT_AUDIT_ACTIONS[event.action] ?? event.action}</Typography>
            <Typography variant="body2">
              Участник: {event.actorName ?? event.actorUserId ?? "Система"}
            </Typography>
            {event.actorProviderId ? (
              <Typography variant="body2">
                Исполнитель: {event.providerName ?? event.actorProviderId}
              </Typography>
            ) : null}
            {event.requestId ? (
              <Typography variant="body2">
                Заявка {event.requestNumber !== null ? `№ ${event.requestNumber}` : event.requestId}
                {event.requestTitle ? ` · ${event.requestTitle}` : ""}
              </Typography>
            ) : null}
          </Stack>
        </Paper>
      ))}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
        }}
      >
        <Button
          component="a"
          href={data.page > 1 ? `${base}?page=${data.page - 1}` : undefined}
          disabled={data.page <= 1}
        >
          Назад
        </Button>
        <Typography variant="body2">Страница {data.page}</Typography>
        <Button
          component="a"
          href={data.page * data.pageSize < data.total ? `${base}?page=${data.page + 1}` : undefined}
          disabled={data.page * data.pageSize >= data.total}
        >
          Далее
        </Button>
      </Stack>
    </Stack>
  );
}
