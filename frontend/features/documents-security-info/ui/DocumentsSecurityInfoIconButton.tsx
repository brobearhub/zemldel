"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import GppGoodIcon from "@mui/icons-material/GppGood";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  type IconButtonProps,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

type Props = {
  size?: "small" | "medium" | "large";
  color?: IconButtonProps["color"];
  icon?: ReactNode;
  ariaLabel?: string;
};

export function DocumentsSecurityInfoIconButton({
  size = "small",
  color = "success",
  icon,
  ariaLabel = "Безопасность документов",
}: Props) {
  const [open, setOpen] = useState(false);

  const tooltipTitle = useMemo(() => {
    return (
      <Box sx={{ maxWidth: 320 }}>
        <Typography sx={{
          fontWeight: 900
        }}>Защита документов</Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Передача — по защищённому каналу (HTTPS/TLS). Хранение — в приватном контуре. Доступ выдаётся только авторизованному пользователю.
        </Typography>
        <Button
          size="small"
          sx={{ mt: 0.75, ml: -0.5 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          Подробнее
        </Button>
      </Box>
    );
  }, []);

  return (
    <>
      <Tooltip
        title={tooltipTitle}
        placement="top"
        slotProps={{
          tooltip: {
            sx: {
              p: 1,
            },
          },
        }}
      >
        <IconButton
          size={size}
          color={color}
          aria-label={ariaLabel}
          onClick={() => setOpen(true)}
        >
          {icon ?? <GppGoodIcon fontSize="large" />}
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="documents-security-dialog-title"
      >
        <DialogTitle id="documents-security-dialog-title">Как мы защищаем данные и документы</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{
                fontWeight: 900
              }}>Передача данных</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 0.5
                }}>
                Передача документов и действий в личном кабинете выполняется по защищённому соединению (HTTPS/TLS).
              </Typography>
            </Box>

            <Box>
              <Typography sx={{
                fontWeight: 900
              }}>Хранение документов и договоров</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 0.5
                }}>
                Файлы хранятся в приватном объектном хранилище.
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 0.75
                }}>
                В хранилище могут применяться механизмы шифрования на стороне хранилища (шифрование данных «на диске»),
                а также политики доступа, ограничивающие чтение объектов.
              </Typography>
            </Box>

            <Box>
              <Typography sx={{
                fontWeight: 900
              }}>Данные в базе</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 0.5
                }}>
                Данные заявки и служебные метаданные хранятся в базе данных с разграничением доступа. Сервер применяет
                проверки ролей и контекста (например, по текущему провайдеру) и не доверяет клиенту в вопросах прав.
              </Typography>
            </Box>

            <Box>
              <Typography sx={{
                fontWeight: 900
              }}>Шифрование чувствительных данных</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 0.5
                }}>
                Для особо чувствительных пользовательских данных может применяться прикладное шифрование — данные
                хранятся в зашифрованном виде и расшифровываются только при наличии прав доступа.
              </Typography>
            </Box>

            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Важно: безопасность зависит не только от технологий, но и от настроек доступа и поведения пользователей.
              Не передавайте документы третьим лицам и используйте надёжные пароли.
            </Typography>

            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Если у вас есть вопросы — напишите в поддержку (info@brobear.ru - разработчик платформы).
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} variant="contained">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
