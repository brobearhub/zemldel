import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { UserLocalDate } from "@/shared/ui/UserLocalDate";
import type { AdminUsersPage } from "./model";
import { fetchAdminUsers } from "./server";

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function UsersPage({ searchParams }: Props) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.page) params.set("page", query.page);
  const data = await fetchAdminUsers<AdminUsersPage>(`/admin/users?${params}`);
  const pageHref = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `/admin/users?${next}`;
  };

  return (
    <Stack spacing={2}>
      <Typography
        component="h1"
        variant="h1"
      >
        Пользователи
      </Typography>
      <Typography color="text.secondary">
        Выберите пользователя, чтобы посмотреть журнал доступа к его паспорту.
      </Typography>
      <Box
        component="form"
        action="/admin/users"
        sx={{
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <TextField
          name="q"
          label="Имя, email или ID пользователя"
          defaultValue={query.q ?? ""}
          size="small"
          slotProps={{
            htmlInput: {
              maxLength: 200,
            },
          }}
          sx={{
            flex: "1 1 280px",
          }}
        />
        <Button
          type="submit"
          variant="contained"
        >
          Найти
        </Button>
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
      >
        Найдено: {data.total}
      </Typography>
      {data.items.length === 0 ? <Typography>Пользователи не найдены.</Typography> : null}
      {data.items.map((user) => (
        <Paper
          key={user.id}
          component="a"
          href={`/admin/users/${user.id}`}
          variant="outlined"
          sx={{
            p: 2,
            color: "inherit",
            textDecoration: "none",
            overflowWrap: "anywhere",
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          <Stack spacing={0.5}>
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              {user.name?.trim() || user.email}
            </Typography>
            <Typography variant="body2">{user.email}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              {user.accountKind === "PROVIDER" ? "Исполнитель" : "Заказчик"}
              {" · Зарегистрирован "}
              <UserLocalDate iso={user.createdAt} />
            </Typography>
            <Typography variant="body2">Журнал доступа к паспорту</Typography>
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
          href={data.page > 1 ? pageHref(data.page - 1) : undefined}
          disabled={data.page <= 1}
        >
          Назад
        </Button>
        <Typography variant="body2">Страница {data.page}</Typography>
        <Button
          component="a"
          href={data.page * data.pageSize < data.total ? pageHref(data.page + 1) : undefined}
          disabled={data.page * data.pageSize >= data.total}
        >
          Далее
        </Button>
      </Stack>
    </Stack>
  );
}
