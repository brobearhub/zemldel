"use client";

import { Alert, Button, Chip, FormControlLabel, Paper, Skeleton, Stack, Switch, Typography } from "@mui/material";
import { useMessengerSettings } from "../model/use-messenger-settings";

export function MessengerSettings() {
  const { items, loading, refreshing, error, busy, links, refresh, action } = useMessengerSettings();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
      }}
    >
      <Stack spacing={2}>
        <Typography
          component="h2"
          variant="h6"
        >
          Мессенджеры
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          Получайте сообщения по заявкам и отвечайте прямо в Telegram или MAX.
          Вся переписка сохраняется на сайте. Можно подключить оба мессенджера.
        </Typography>
        {error && (
          <Alert
            severity="error"
            action={(
              <Button
                color="inherit"
                onClick={() => void refresh()}
                loading={refreshing}
              >
                Повторить
              </Button>
            )}
          >
            {error}
          </Alert>
        )}
        {loading ? <Skeleton height={120} /> : items.map((item) => {
          const name = item.platform === "TELEGRAM" ? "Telegram" : "MAX";
          const link = links[item.platform];
          const validLink = item.pending && link && item.pending.expiresAt === link.expiresAt;
          return (
            <Stack
              key={item.platform}
              spacing={1.5}
              sx={{
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                minWidth: 0,
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
                <Chip
                  size="small"
                  color={item.connected && !item.blocked ? "success" : "default"}
                  label={item.connected ? (item.blocked ? "Бот остановлен" : "Подключён") : "Не подключён"}
                />
              </Stack>
              {item.connected ? (
                <>
                  <Typography
                    variant="body2"
                    sx={{ overflowWrap: "anywhere" }}
                  >
                    Аккаунт: {item.displayName}
                  </Typography>
                  {item.blocked && <Alert severity="warning">Запустите бота снова в {name}, чтобы возобновить получение сообщений.</Alert>}
                  <FormControlLabel
                    label="Дублировать входящие сообщения"
                    control={(
                      <Switch
                        checked={item.notificationsEnabled}
                        disabled={Boolean(busy)}
                        onChange={(_, checked) => void action(item.platform, "notifications", checked)}
                      />
                    )}
                  />
                  <Button
                    variant="outlined"
                    color="inherit"
                    loading={busy === `${item.platform}:disconnect`}
                    disabled={Boolean(busy) && busy !== `${item.platform}:disconnect`}
                    onClick={() => void action(item.platform, "disconnect")}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Отключить {name}
                  </Button>
                </>
              ) : item.pending?.displayName ? (
                <>
                  <Alert severity="info">Подтвердите, что аккаунт «{item.pending.displayName}» принадлежит вам.</Alert>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                  >
                    <Button
                      variant="contained"
                      loading={busy === `${item.platform}:confirm`}
                      disabled={Boolean(busy) && busy !== `${item.platform}:confirm`}
                      onClick={() => void action(item.platform, "confirm", item.pending!.id)}
                    >
                      Подтвердить подключение
                    </Button>
                    <Button
                      color="inherit"
                      loading={busy === `${item.platform}:disconnect`}
                      disabled={Boolean(busy) && busy !== `${item.platform}:disconnect`}
                      onClick={() => void action(item.platform, "disconnect")}
                    >
                      Это не мой аккаунт
                    </Button>
                  </Stack>
                </>
              ) : (
                <>
                  {!item.configured && <Typography variant="body2" color="text.secondary">Подключение скоро станет доступно.</Typography>}
                  {item.pending && <Typography variant="body2">Откройте бота, нажмите «Начать» и вернитесь сюда для подтверждения. Ссылка действует 10 минут.</Typography>}
                  {validLink && (
                    <Button
                      component="a"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      sx={{ alignSelf: "flex-start" }}
                    >
                      Открыть {name}
                    </Button>
                  )}
                  <Button
                    variant={validLink ? "text" : "outlined"}
                    loading={busy === `${item.platform}:link`}
                    disabled={!item.configured || (Boolean(busy) && busy !== `${item.platform}:link`)}
                    onClick={() => void action(item.platform, "link")}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {item.pending ? "Создать новую ссылку" : `Подключить ${name}`}
                  </Button>
                </>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
}
