"use client";

import { useEffect, useState } from "react";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, ButtonBase, Collapse, IconButton, Paper, Typography } from "@mui/material";
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
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

const PREVIEW_COUNT = 3;

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
  expanded: expandedProp = false,
  onExpandedChange,
}: Props) {
  const { requests, error, isLoading, markAwaitingCustomerReply } =
    useRequestList(serviceId);
  const [replyItem, setReplyItem] = useState<RequestProDto | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [ownExpanded, setOwnExpanded] = useState(false);
  const expanded = onExpandedChange != null ? expandedProp : ownExpanded;

  function changeExpanded(next: boolean) {
    if (onExpandedChange) onExpandedChange(next);
    else setOwnExpanded(next);
  }
  const needsReply =
    requests?.filter((request) => !request.awaitingCustomerReply).length ?? 0;
  useEffect(() => {
    if (serviceId && requests !== null)
      onSummary?.(serviceId, { count: requests.length, needsReply });
  }, [serviceId, requests, needsReply, onSummary]);
  const ordered = requests
    ? [...requests].sort(
        (a, b) =>
          Number(a.awaitingCustomerReply) - Number(b.awaitingCustomerReply) ||
          Number(b.status === "NEW") - Number(a.status === "NEW"),
      )
    : null;
  const canFold = (requests?.length ?? 0) > PREVIEW_COUNT;
  const previewRequests = canFold ? ordered?.slice(0, PREVIEW_COUNT) : ordered;
  const restRequests = canFold ? (ordered?.slice(PREVIEW_COUNT) ?? []) : [];

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          px: 2.5,
          py: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
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
              sx={{ fontWeight: 700, fontSize: 14, color: "text.primary" }}
            >
              {requests.length}
            </Typography>
          ) : null}
        </Box>
        {canFold ? (
          <IconButton
            size="small"
            aria-expanded={expanded}
            aria-label={expanded ? "Свернуть заявки" : "Развернуть заявки"}
            onClick={() => changeExpanded(!expanded)}
            sx={{ color: "text.secondary" }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        ) : null}
      </Box>

      {isLoading ? (
        <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>
          Загрузка…
        </Typography>
      ) : error ? (
        <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>
          {error}
        </Typography>
      ) : requests && requests.length === 0 ? (
        <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>
          {emptyLabel}
        </Typography>
      ) : (
        <>
          <Box>
            {previewRequests?.map((request) => (
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
          {restRequests.length > 0 ? (
            <Collapse in={expanded} timeout="auto">
              <Box>
                {restRequests.map((request) => (
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
            </Collapse>
          ) : null}
          {canFold ? (
            <ButtonBase
              type="button"
              aria-expanded={expanded}
              onClick={() => changeExpanded(!expanded)}
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
              {expanded ? "Свернуть" : "Ещё"}
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ButtonBase>
          ) : null}
        </>
      )}
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
