"use client";

import { useState } from "react";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Collapse, IconButton, Paper, Typography } from "@mui/material";
import type { RequestProDto } from "@/entities/request";
import { useRequestList } from "../model/use-request-list";
import { ProviderRequestReplyDialog } from "./ProviderRequestReplyDialog";
import { ServiceRequestRow } from "./ServiceRequestRow";

type Props = {
  serviceId: string | null;
  serviceTitle?: string;
  titleFor?: (request: RequestProDto) => string;
  emptyLabel?: string;
  showCustomerAvatar?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

const PREVIEW_COUNT = 3;
const PREVIEW_FADE_PX = 72;

function rowTitle(request: RequestProDto, serviceTitle: string | undefined, titleFor?: (request: RequestProDto) => string) {
  if (titleFor) return titleFor(request);
  const title = serviceTitle?.trim() ?? "";
  return title.length > 0 ? title : "Заявка";
}

export function ServiceRequestsPanel({
  serviceId,
  serviceTitle,
  titleFor,
  emptyLabel = "Пока нет заявок",
  showCustomerAvatar = false,
  expanded: expandedProp = false,
  onExpandedChange,
}: Props) {
  const { requests, error, isLoading, markAwaitingCustomerReply } = useRequestList(serviceId);
  const [replyItem, setReplyItem] = useState<RequestProDto | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [ownExpanded, setOwnExpanded] = useState(false);
  const expanded = onExpandedChange != null ? expandedProp : ownExpanded;

  function changeExpanded(next: boolean) {
    if (onExpandedChange) onExpandedChange(next);
    else setOwnExpanded(next);
  }
  const canFold = (requests?.length ?? 0) > PREVIEW_COUNT;
  const previewRequests = canFold ? requests?.slice(0, PREVIEW_COUNT) : requests;
  const restRequests = canFold ? (requests?.slice(PREVIEW_COUNT) ?? []) : [];

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 2.5, py: 1 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18, color: "text.primary" }}>
            Заявки
          </Typography>
          {requests !== null ? (
            <Typography component="span" sx={{ fontWeight: 700, fontSize: 14, color: "text.primary" }}>
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
        <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>Загрузка…</Typography>
      ) : error ? (
        <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>{error}</Typography>
      ) : requests && requests.length === 0 ? (
        <Typography sx={{ px: 2.5, pb: 2.5, color: "text.secondary" }}>{emptyLabel}</Typography>
      ) : (
        <>
        <Box sx={{ position: "relative" }}>
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
          {canFold ? (
            <Box
              component="button"
              type="button"
              aria-expanded={expanded}
              aria-label="Показать остальные заявки"
              tabIndex={expanded ? -1 : 0}
              onClick={() => changeExpanded(true)}
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: PREVIEW_FADE_PX,
                border: 0,
                p: 0,
                cursor: "pointer",
                opacity: expanded ? 0 : 1,
                pointerEvents: expanded ? "none" : "auto",
                transition: "opacity 320ms ease",
                background: "linear-gradient(to bottom, transparent, var(--mui-palette-background-paper))",
              }}
            />
          ) : null}
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
        </>
      )}
      <ProviderRequestReplyDialog
        item={replyItem}
        onClose={() => setReplyItem(null)}
        onSendingChange={(sending) => setSendingId(sending && replyItem ? replyItem.id : null)}
        onSent={(sent, body) => markAwaitingCustomerReply(sent.id, body)}
      />
    </Paper>
  );
}
