"use client";

import { useId, useRef } from "react";
import Link from "next/link";
import dayjs, { type Dayjs } from "dayjs";
import {
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { getRequestStatusLabel } from "@/entities/request/dto/request.dto";
import {
  assigneeName,
  requestLabel,
  type TaskHistory,
  type TeamTask,
  type TaskView,
  type TasksWorkspaceData,
} from "./model";
import { actionSx, panelSx } from "./styles";

function historyDescription(entry: TaskHistory, previous?: TaskHistory) {
  if (!previous) return "Создана задача";
  const changes: string[] = [];
  if (entry.done !== previous.done)
    changes.push(entry.done ? "Отмечена выполненной" : "Возвращена в работу");
  if (entry.title !== previous.title) changes.push("Изменено название");
  if (entry.note !== previous.note) changes.push("Изменена заметка");
  if (entry.assigneeUserId !== previous.assigneeUserId)
    changes.push("Изменён исполнитель");
  if (entry.requestId !== previous.requestId) changes.push("Изменена заявка");
  if (entry.dueAt !== previous.dueAt)
    changes.push(
      entry.dueAt
        ? `Срок: ${dayjs(entry.dueAt).locale("ru").format("D MMM YYYY, HH:mm")}`
        : "Срок снят",
    );
  return changes.join(" · ") || "Задача сохранена";
}

type Props = {
  task: TeamTask;
  data: TasksWorkspaceData;
  view: TaskView;
  expanded: boolean;
  busy: boolean;
  now: Dayjs;
  onExpand: (id: string | null) => void;
  onEdit: (task: TeamTask) => void;
  onToggleDone: (task: TeamTask) => void;
  onAssignee: (id: string) => void;
};

export function TaskRow({
  task,
  data,
  view,
  expanded,
  busy,
  now,
  onExpand,
  onEdit,
  onToggleDone,
  onAssignee,
}: Props) {
  const regionId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const request = data.requests.find((item) => item.id === task.requestId);
  const overdue = !task.done && !!task.dueAt && dayjs(task.dueAt).isBefore(now);
  const member = assigneeName(task.assigneeUserId, data.members);
  const deadline = task.dueAt
    ? dayjs(task.dueAt).locale("ru").format("D MMM · HH:mm")
    : "Без срока";
  const disabled = busy || !data.limits.team;
  return (
    <Box
      data-testid={`task-${task.id}`}
      sx={{
        "& + &": {
          borderTop: 1,
          borderColor: "divider",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          px: {
            xs: 1,
            sm: 2,
          },
          bgcolor: task.done
            ? (theme) => alpha(theme.palette.primary.main, 0.05)
            : undefined,
        }}
      >
        <Checkbox
          size="small"
          checked={task.done}
          disabled={disabled}
          onChange={() => onToggleDone(task)}
          slotProps={{
            input: {
              "aria-label": `${task.done ? "Вернуть в работу" : "Выполнить"}: ${task.title}`,
            },
          }}
          sx={{
            mt: 1,
            ml: -1,
            color: "primary.main",
            "&.Mui-checked": {
              color: "text.primary",
            },
          }}
        />
        <ButtonBase
          ref={trigger}
          onClick={() => onExpand(expanded ? null : task.id)}
          aria-expanded={expanded}
          aria-controls={expanded ? regionId : undefined}
          sx={{
            flex: 1,
            minWidth: 0,
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "minmax(0, 1fr) auto",
            },
            gap: {
              xs: 1,
              sm: 2,
            },
            py: 2,
            textAlign: "left",
            alignItems: "start",
            "&.Mui-focusVisible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: -2,
            },
          }}
        >
          <Stack
            spacing={0.5}
            sx={{ minWidth: 0 }}
          >
            <Typography
              component="span"
              variant="body2"
              sx={{
                color: task.done ? "text.secondary" : "text.primary",

                fontWeight: 600,
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </Typography>
            <Stack
              direction="row"
              useFlexGap
              sx={{
                flexWrap: "wrap",
                columnGap: 2,
                rowGap: 0.5,
              }}
            >
              {view !== "requests" && (
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    overflowWrap: "anywhere",
                  }}
                >
                  {request
                    ? requestLabel(request)
                    : task.requestId
                      ? "Заявка недоступна"
                      : "Без заявки"}
                </Typography>
              )}
              {view !== "assignees" && (
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  {member}
                </Typography>
              )}
            </Stack>
          </Stack>
          <Stack
            direction={{ xs: "row", sm: "column" }}
            spacing={{ xs: 1, sm: 0.5 }}
            sx={{
              alignItems: {
                xs: "center",
                sm: "flex-end",
              },
            }}
          >
            <Typography
              component="span"
              variant="body2"
              sx={{
                color: overdue ? "warning.main" : "text.secondary",
              }}
            >
              {deadline}
            </Typography>
            <Typography
              component="span"
              variant="body2"
              sx={{
                color: "text.secondary",
              }}
            >
              {task.done ? "Выполнена" : overdue ? "Просрочена" : "Открыта"}
            </Typography>
          </Stack>
        </ButtonBase>
      </Box>
      <Collapse
        in={expanded}
        unmountOnExit
      >
        <Stack
          id={regionId}
          component="section"
          aria-label={`Детали: ${task.title}`}
          spacing={2}
          sx={{
            p: {
              xs: 2,
              sm: 2.5,
            },
            borderTop: 1,
            borderColor: "primary.main",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: 18,
              }}
            >
              Детали задачи
            </Typography>
            <Stack
              direction="row"
              spacing={1}
            >
              <Button
                size="small"
                variant="outlined"
                disabled={disabled}
                onClick={() => onEdit(task)}
              >
                Изменить
              </Button>
              <IconButton
                size="small"
                aria-label="Закрыть детали задачи"
                onClick={() => {
                  onExpand(null);
                  trigger.current?.focus();
                }}
              >
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <Stack
              spacing={1}
              sx={{
                ...panelSx,
                p: 1.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                }}
              >
                Связанная заявка
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  overflowWrap: "anywhere",
                }}
              >
                {request
                  ? requestLabel(request)
                  : task.requestId
                    ? "Заявка недоступна"
                    : "Без заявки"}
              </Typography>
              {request && (
                <>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {[
                      request.customerName,
                      getRequestStatusLabel(request.status),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Typography>
                  <Button
                    component={Link}
                    href={`/pro/requests/${request.id}`}
                    size="small"
                    endIcon={<OpenInNewRoundedIcon />}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Открыть заявку
                  </Button>
                </>
              )}
            </Stack>
            <Stack
              spacing={1}
              sx={{
                ...panelSx,
                p: 1.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                }}
              >
                Исполнитель
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                }}
              >
                {member}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                }}
              >
                {task.dueAt
                  ? `Срок: ${dayjs(task.dueAt).locale("ru").format("D MMMM YYYY, HH:mm")}`
                  : "Без срока"}
              </Typography>
              {task.assigneeUserId && (
                <Button
                  size="small"
                  sx={{ alignSelf: "flex-start" }}
                  onClick={() => onAssignee(task.assigneeUserId!)}
                >
                  Задачи исполнителя
                </Button>
              )}
            </Stack>
          </Box>
          <Stack spacing={0.5}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Внутренняя заметка
            </Typography>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {task.note || "Заметка не добавлена"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Видна только участникам команды
            </Typography>
          </Stack>
          <Stack
            spacing={1}
            sx={{
              borderTop: 1,
              borderColor: "divider",
              pt: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
              }}
            >
              История изменений
            </Typography>
            {!task.history?.length && (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                }}
              >
                История пока пуста
              </Typography>
            )}
            {task.history
              ?.map((entry, index, history) => (
                <Typography
                  key={`${entry.at}-${index}`}
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  {dayjs(entry.at).locale("ru").format("D MMM, HH:mm")} ·{" "}
                  {assigneeName(entry.userId, data.members)} ·{" "}
                  {historyDescription(entry, history[index - 1])}
                </Typography>
              ))
              .reverse()}
          </Stack>
          <Button
            size="small"
            variant="contained"
            disabled={disabled}
            onClick={() => onToggleDone(task)}
            sx={{
              ...actionSx,
              alignSelf: "flex-end",
            }}
          >
            {task.done ? "Вернуть в работу" : "Отметить выполненной"}
          </Button>
        </Stack>
      </Collapse>
    </Box>
  );
}
