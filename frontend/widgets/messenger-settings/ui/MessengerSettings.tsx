"use client";

import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useMessengerSettings } from "../model/use-messenger-settings";

export function MessengerSettings({
  singleColumn = false,
}: {
  singleColumn?: boolean;
}) {
  const { items, loading, refreshing, error, busy, links, refresh, action } =
    useMessengerSettings();
  const unavailable = items.filter(
    (item) => !item.configured && !item.connected,
  );
  const unavailableName =
    unavailable[0]?.platform === "TELEGRAM" ? "Telegram" : "MAX";

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
      }}
    >
      <Stack
        spacing={2.5}
      >
        <Typography
          component="h2"
          variant="h6"
          sx={{
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          Мессенджеры
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          Отвечайте на заявки в Telegram и MAX — вся переписка останется на
          сайте.
        </Typography>
        {error && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                onClick={() => void refresh()}
                loading={refreshing}
              >
                Повторить
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {!loading && unavailable.length > 0 && (
          <Box
            sx={(theme) => ({
              display: "flex",
              alignItems: { xs: "flex-start", tablet: "center" },
              justifyContent: "space-between",
              flexDirection: { xs: "column", tablet: "row" },
              gap: 1.5,
              px: 2,
              py: 1.5,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.13),
            })}
          >
            <Typography
              variant="body2"
            >
              {unavailable.length === items.length
                ? "Подключение мессенджеров скоро станет доступно"
                : `Подключение ${unavailableName} скоро станет доступно`}
            </Typography>
            <Box
              component="span"
              sx={{
                flexShrink: 0,
                px: 1.5,
                py: 0.5,
                borderRadius: 10,
                bgcolor: "background.paper",
                color: "text.secondary",
                fontSize: 12,
                lineHeight: 1.3,
              }}
            >
              Скоро
            </Box>
          </Box>
        )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: singleColumn
                ? "minmax(0, 1fr)"
                : "repeat(2, minmax(0, 1fr))",
            },
            gap: singleColumn ? 0.5 : 1.5,
          }}
        >
          {loading ? (
            <>
              <Skeleton
                variant="rounded"
                height={singleColumn ? 36 : 52}
              />
              <Skeleton
                variant="rounded"
                height={singleColumn ? 36 : 52}
              />
            </>
          ) : (
            items.map((item) => {
              const name = item.platform === "TELEGRAM" ? "Telegram" : "MAX";
              const icon =
                item.platform === "TELEGRAM"
                  ? "/messengers/telegram.png"
                  : "/messengers/max.png";
              const link = links[item.platform];
              const validLink =
                item.pending &&
                link &&
                item.pending.expiresAt === link.expiresAt;
              return (
                <Stack
                  key={item.platform}
                  spacing={1.5}
                  sx={{
                    p: singleColumn ? 0 : 1.5,
                    border: singleColumn ? 0 : 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    minWidth: 0,
                  }}
                >
                  <Stack
                    direction={singleColumn ? "row" : { xs: "column", sm: "row" }}
                    sx={{
                      alignItems: singleColumn
                        ? "center"
                        : { xs: "flex-start", sm: "center" },
                      justifyContent: "space-between",
                      gap: 1,
                      minHeight: 24,
                    }}
                  >
                    <Stack
                      direction="row"
                      sx={{
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      <Box
                        component="img"
                        src={icon}
                        alt=""
                        sx={{
                          width: 24,
                          height: 24,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                        }}
                      >
                        {name}
                      </Typography>
                    </Stack>
                    {item.connected ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          minWidth: 0,
                          maxWidth: "100%",
                          overflowWrap: "anywhere",
                          textAlign: { xs: "left", sm: "right" },
                        }}
                      >
                        {item.displayName?.trim() || "Подключено"}
                      </Typography>
                    ) : (
                      <Button
                        size="small"
                        variant="text"
                        color="inherit"
                        aria-label={`Подключить ${name}`}
                        loading={busy === `${item.platform}:link`}
                        disabled={
                          !item.configured ||
                          Boolean(item.pending) ||
                          (Boolean(busy) && busy !== `${item.platform}:link`)
                        }
                        onClick={() => void action(item.platform, "link")}
                        sx={{
                          flexShrink: 0,
                          minWidth: 0,
                          p: 0.5,
                          color: "text.secondary",
                          textTransform: "none",
                          "&.Mui-disabled": {
                            color: "text.secondary",
                          },
                        }}
                      >
                        Подключить
                      </Button>
                    )}
                  </Stack>
                  {item.connected ? (
                    <>
                      {item.blocked && (
                        <Alert
                          severity="warning"
                        >
                          Запустите бота снова в {name}, чтобы возобновить
                          получение сообщений.
                        </Alert>
                      )}
                      <FormControlLabel
                        label="Дублировать входящие сообщения"
                        control={
                          <Switch
                            checked={item.notificationsEnabled}
                            disabled={Boolean(busy)}
                            onChange={(_, checked) =>
                              void action(
                                item.platform,
                                "notifications",
                                checked,
                              )
                            }
                          />
                        }
                      />
                      <Button
                        variant="outlined"
                        color="inherit"
                        loading={busy === `${item.platform}:disconnect`}
                        disabled={
                          Boolean(busy) &&
                          busy !== `${item.platform}:disconnect`
                        }
                        onClick={() => void action(item.platform, "disconnect")}
                        sx={{
                          alignSelf: "flex-start",
                        }}
                      >
                        Отключить {name}
                      </Button>
                    </>
                  ) : item.pending?.displayName ? (
                    <>
                      <Alert
                        severity="info"
                      >
                        Подтвердите, что аккаунт «{item.pending.displayName}»
                        принадлежит вам.
                      </Alert>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                      >
                        <Button
                          variant="contained"
                          loading={busy === `${item.platform}:confirm`}
                          disabled={
                            Boolean(busy) && busy !== `${item.platform}:confirm`
                          }
                          onClick={() =>
                            void action(
                              item.platform,
                              "confirm",
                              item.pending!.id,
                            )
                          }
                        >
                          Подтвердить подключение
                        </Button>
                        <Button
                          color="inherit"
                          loading={busy === `${item.platform}:disconnect`}
                          disabled={
                            Boolean(busy) &&
                            busy !== `${item.platform}:disconnect`
                          }
                          onClick={() =>
                            void action(item.platform, "disconnect")
                          }
                        >
                          Это не мой аккаунт
                        </Button>
                      </Stack>
                    </>
                  ) : item.pending ? (
                    <>
                      <Typography
                        variant="body2"
                      >
                        Откройте бота, нажмите «Начать» и вернитесь сюда для
                        подтверждения. Ссылка действует 10 минут.
                      </Typography>
                      {validLink && (
                        <Button
                          component="a"
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="contained"
                          sx={{
                            alignSelf: "flex-start",
                          }}
                        >
                          Открыть {name}
                        </Button>
                      )}
                      <Button
                        variant="text"
                        loading={busy === `${item.platform}:link`}
                        disabled={
                          !item.configured ||
                          (Boolean(busy) && busy !== `${item.platform}:link`)
                        }
                        onClick={() => void action(item.platform, "link")}
                        sx={{
                          alignSelf: "flex-start",
                        }}
                      >
                        Создать новую ссылку
                      </Button>
                    </>
                  ) : null}
                </Stack>
              );
            })
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
