"use client";

import { useEffect, useId, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  ButtonBase,
  Collapse,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import type { RequestProDto } from "@/entities/request";
import { useRequestList } from "../model/use-request-list";
import { ProviderRequestReplyDialog } from "./ProviderRequestReplyDialog";
import { ServiceRequestRow } from "./ServiceRequestRow";

type Props = {
  serviceId: string | null;
  onSummary?: (
    id: string,
    summary: { count: number; needsReply: number },
  ) => void;
  serviceTitle?: string;
  titleFor?: (request: RequestProDto) => string;
  emptyLabel?: string;
  showCustomerAvatar?: boolean;
};

function rowTitle(
  request: RequestProDto,
  serviceTitle: string | undefined,
  titleFor?: (request: RequestProDto) => string,
) {
  if (titleFor) return titleFor(request);
  const title = serviceTitle?.trim() ?? "";
  return title.length > 0 ? title : "Заявка";
}

export function ServiceRequestsPanel({
  serviceId,
  onSummary,
  serviceTitle,
  titleFor,
  emptyLabel = "Пока нет заявок",
  showCustomerAvatar = false,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const listId = useId();
  const [search, setSearch] = useState("");
  const [unfilteredTotal, setUnfilteredTotal] = useState<number | null>(null);
  const isSearching = search.trim().length > 0;
  const {
    requests,
    total,
    needsReply,
    hasMore,
    isLoadingMore,
    loadMore,
    error,
    rateLimitReached,
    retryAfterSeconds,
    isLoading,
    hasPendingRequests,
    isRefreshing,
    showNewRequests,
    markAwaitingCustomerReply,
  } = useRequestList(serviceId, search);
  const isRateLimited = retryAfterSeconds > 0;
  const retryTime = `${Math.floor(retryAfterSeconds / 60)}:${String(retryAfterSeconds % 60).padStart(2, "0")}`;
  const [replyItem, setReplyItem] = useState<RequestProDto | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  useEffect(() => {
    if (requests !== null && !isSearching) {
      setUnfilteredTotal(total);
      if (serviceId) onSummary?.(serviceId, { count: total, needsReply });
    }
  }, [serviceId, requests, total, needsReply, isSearching, onSummary]);

  return (
    <Paper
      elevation={0}
      sx={{
        height: expanded ? "100%" : "auto",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr) auto",
            sm: "auto minmax(0, 1fr) auto",
          },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          px: serviceId === null ? { xs: 1.5, sm: 2.5 } : 2.5,
          py: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 1,
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontWeight: 800,
              fontSize: 18,
              color: "text.primary",
            }}
          >
            Заявки
          </Typography>
          {requests !== null ? (
            <Typography
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: 14,
                color: "text.primary",
              }}
            >
              {isSearching && unfilteredTotal !== null
                ? `${total} из ${unfilteredTotal}`
                : total}
            </Typography>
          ) : null}
        </Box>
        <TextField
          size="small"
          placeholder="Номер, имя или фамилия"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          slotProps={{
            htmlInput: {
              "aria-label": "Поиск заявок по номеру, имени или фамилии",
              maxLength: 200,
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="Очистить поиск заявок"
                    onClick={() => setSearch("")}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
          sx={{
            gridColumn: {
              xs: "1 / -1",
              sm: "2",
            },
            gridRow: {
              xs: 2,
              sm: 1,
            },
            justifySelf: "end",
            width: "100%",
            maxWidth: {
              sm: 340,
            },
          }}
        />
        <Box
          sx={{
            gridColumn: {
              xs: 2,
              sm: 3,
            },
            gridRow: 1,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {serviceId === null || ((error || rateLimitReached) && !hasMore) ? (
            <Button
              size="small"
              variant="text"
              disabled={isRateLimited || isRefreshing || (!hasPendingRequests && !error && !rateLimitReached)}
              onClick={() => void showNewRequests()}
              sx={{
                visibility:
                  hasPendingRequests || error || rateLimitReached || isRefreshing
                    ? "visible"
                    : "hidden",
                color: "text.primary",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {isRefreshing
                ? "Обновление…"
                : hasPendingRequests
                  ? "Показать новые"
                  : "Повторить"}
            </Button>
          ) : null}
          <IconButton
            size="small"
            aria-label={expanded ? "Свернуть список заявок" : "Развернуть список заявок"}
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((value) => !value)}
          >
            <ExpandMoreIcon
              sx={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: (theme) => theme.transitions.create("transform"),
              }}
            />
          </IconButton>
        </Box>
      </Box>
      <Collapse
        id={listId}
        in={expanded}
      >
        {rateLimitReached ? (
          <Alert
            severity={isRateLimited ? "warning" : "info"}
            role="status"
            aria-live="polite"
            sx={{
              mx: { xs: 1.5, sm: 2.5 },
              mb: 1.5,
            }}
          >
            <AlertTitle>
              {isRateLimited ? "Подождите немного" : "Можно продолжить"}
            </AlertTitle>
            {isRateLimited
              ? "Вы слишком часто запрашиваете заявки. Загрузка временно приостановлена. "
              : "Ожидание закончилось. Можно снова загружать заявки."}
            {isRateLimited ? (
              <Box
                component="span"
                role="timer"
                aria-live="off"
                aria-label="До следующего запроса"
                sx={{
                  display: "block",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {`Повторить можно через ${retryTime}`}
              </Box>
            ) : null}
          </Alert>
        ) : null}
        {error && requests !== null ? (
          <Typography
            role="alert"
            sx={{
              px: 2.5,
              pb: 1,
              color: "text.secondary",
            }}
          >
            {error}
          </Typography>
        ) : null}
        <Box
          role="status"
          sx={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clipPath: "inset(50%)",
          }}
        >
          {hasPendingRequests
            ? "Есть новые заявки. Нажмите «Показать новые», чтобы обновить список."
            : ""}
        </Box>

        {isLoading ? (
          <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>
            Загрузка…
          </Typography>
        ) : requests === null && rateLimitReached ? null : error && requests === null ? (
          <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>
            {error}
          </Typography>
        ) : requests?.length === 0 && !hasMore ? (
          <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>
            {isSearching ? "Заявки не найдены" : emptyLabel}
          </Typography>
        ) : (
          <>
            <Box>
              {requests?.map((request) => (
                <ServiceRequestRow
                  key={request.id}
                  request={request}
                  title={rowTitle(request, serviceTitle, titleFor)}
                  showCustomerAvatar={showCustomerAvatar}
                  sending={sendingId === request.id}
                  onReply={setReplyItem}
                />
              ))}
            </Box>
            {hasMore ? (
              <ButtonBase
                type="button"
                disabled={isRateLimited || isLoadingMore || isRefreshing}
                onClick={() => void loadMore()}
                sx={{
                  display: "flex",
                  width: "100%",
                  gap: 0.5,
                  py: 1.25,
                  borderTop: "1px solid",
                  borderColor: "divider",
                  color: "text.primary",
                  fontWeight: 700,
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                  "&.Mui-focusVisible": {
                    outline: "2px solid",
                    outlineColor: "primary.dark",
                    outlineOffset: -2,
                  },
                }}
              >
                {isLoadingMore ? "Загрузка…" : "Ещё"}
                <ExpandMoreIcon />
              </ButtonBase>
            ) : null}
          </>
        )}
      </Collapse>
      <ProviderRequestReplyDialog
        item={replyItem}
        onClose={() => setReplyItem(null)}
        onSendingChange={(sending) =>
          setSendingId(sending && replyItem ? replyItem.id : null)
        }
        onSent={(sent, body) => markAwaitingCustomerReply(sent.id, body)}
      />
    </Paper>
  );
}
