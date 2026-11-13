"use client";

import CheckIcon from "@mui/icons-material/Check";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  formatRequestDate,
  formatRequestNumber,
  orderReplyPreview,
  ReplyPreviewLines,
  visibleReplyPreview,
  RequestPriceBlock,
  type RequestCustomerDto,
} from "@/entities/request";
import { useAppSelector } from "@/core/store/hooks";
import { CdnFillImage } from "@/shared/ui/cdn-image";
import {
  getCustomerRequestCardContent,
  getCustomerRequestCardTone,
  getCustomerRequestOpenAge,
  groupCustomerRequestsByStatus,
  type CustomerRequestBoardColumn,
  type CustomerRequestCardTone,
} from "../lib/customer-request-board";
import { brown } from "@mui/material/colors";

type Props = {
  items: RequestCustomerDto[];
  deletingId: string | null;
  sendingId?: string | null;
  onOpen: (item: RequestCustomerDto) => void;
  onDelete: (item: RequestCustomerDto) => void;
  onReply: (item: RequestCustomerDto) => void;
};

function cardToneBg(tone: CustomerRequestCardTone) {
  return (theme: {
    palette: { primary: { main: string }; action: { hover: string } };
  }) =>
    tone === "sage"
      ? alpha(theme.palette.primary.main, 0.18)
      : theme.palette.action.hover;
}

function BoardCard({
  item,
  deleting,
  sending,
  onOpen,
  onDelete,
  onReply,
}: {
  item: RequestCustomerDto;
  deleting: boolean;
  sending: boolean;
  onOpen: (item: RequestCustomerDto) => void;
  onDelete: (item: RequestCustomerDto) => void;
  onReply: (item: RequestCustomerDto) => void;
}) {
  const viewer = useAppSelector((state) => state.auth.user);
  const { title, letter, photo, metaName, providerReply, customerReply } =
    getCustomerRequestCardContent(item);
  const replyLines = visibleReplyPreview({
    lines: orderReplyPreview({
      customerMessage: customerReply,
      providerMessage: providerReply,
      providerSpokeLast: !item.awaitingProviderReply,
    }),
    waitingForReply: item.awaitingProviderReply,
    ownAuthor: "customer",
  });
  const closed = item.status === "CLOSED";
  const tone = getCustomerRequestCardTone(item);
  const date = formatRequestDate(item.createdAt);
  const meta = metaName ? `${metaName} · ${date}` : date;
  const age = getCustomerRequestOpenAge(item.createdAt);

  return (
    <Paper
      elevation={0}
      role={closed ? undefined : "link"}
      tabIndex={closed ? undefined : 0}
      aria-label={closed ? undefined : title}
      aria-disabled={closed ? true : undefined}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (closed) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen(item);
      }}
      sx={{
        position: "relative",
        overflow: "hidden",
        cursor: closed ? "default" : "pointer",
        transition: (theme) => theme.transitions.create(["box-shadow"]),
        ...(closed
          ? {}
          : {
              "&:hover": { boxShadow: 1 },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            }),
      }}
    >
      <Stack direction="row" sx={{ alignItems: "stretch", minHeight: 88 }}>
        <Box
          sx={{
            position: "relative",
            width: 72,
            display: { xs: "none", sm: "grid" },
            flexShrink: 0,
            bgcolor: cardToneBg(tone),
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          {photo ? (
            <CdnFillImage
              src={photo}
              alt=""
              sizes="72px"
              unoptimized={process.env.NODE_ENV !== "production"}
              style={{
                objectFit: "cover",
              }}
            />
          ) : (
            <Typography
              aria-hidden
              sx={{
                color: "text.secondary",
                fontSize: "1.75rem",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {letter}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: "stretch",
              gap: 1.5,
              minHeight: 116,
              px: 1.5,
              py: 1.25,
            }}
          >
            <Box
              sx={{
                minWidth: 0,
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                title={title}
                sx={{
                  fontWeight: 600,
                  fontSize: "1.125rem",
                  lineHeight: 26 / 18,
                }}
              >
                {item.number != null ? `${formatRequestNumber(item)} · ` : ""}
                {title}
              </Typography>
              <Box
                sx={{
                  minWidth: 0,
                  mt: 1.5,
                }}
              >
                <RequestPriceBlock
                  totalAmountRubles={item.totalAmountRubles}
                  servicePriceRubles={item.servicePriceRubles}
                  priceProposal={item.priceProposal}
                  serviceId={item.serviceId}
                />
              </Box>
              <Typography
                variant="caption"
                title={meta}
                sx={{
                  color: "text.secondary",
                  display: "block",
                  mt: "auto",
                  pt: 1.5,
                  pb: 0.5,
                }}
              >
                {meta}
              </Typography>
            </Box>
            <Stack
              sx={{
                flexShrink: 0,
                minWidth: 32,
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                pt: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "1.375rem",
                    lineHeight: 1,
                    color: "text.secondaryLight",
                    fontFamily: "monospace",
                  }}
                >
                  {age.days}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondaryLight",
                    display: "block",
                    mt: 0.25,
                  }}
                >
                  {age.label}
                </Typography>
              </Box>
              {item.canDeleteByCustomer ? (
                <IconButton
                  size="small"
                  color="error"
                  aria-label="Удалить заявку"
                  loading={deleting}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(item);
                  }}
                  sx={{
                    flexShrink: 0,
                  }}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              ) : null}
            </Stack>
          </Stack>
          {replyLines.length > 0 ? (
            <>
              <Divider
                sx={{ borderBottomStyle: "dashed", borderColor: "divider" }}
              />
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  pl: 1.5,
                  pr: 0.5,
                  py: 0.75,
                  minWidth: 0,
                }}
              >
                <ReplyPreviewLines
                  lines={replyLines}
                  ownAuthor="customer"
                  ownAvatar={{
                    src: viewer?.image ?? null,
                    name: viewer?.name ?? null,
                  }}
                />
                {sending ? (
                  <CircularProgress size={18} aria-label="Отправка" />
                ) : item.awaitingProviderReply || !providerReply ? (
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", gap: 0.5, flexShrink: 0 }}
                  >
                    {item.awaitingProviderReply ? (
                      <CheckIcon
                        titleAccess="Ответ отправлен"
                        aria-label="Ответ отправлен"
                        sx={{ fontSize: 18, color: "primary.main" }}
                      />
                    ) : null}
                    <Typography
                      variant="caption"
                      sx={{
                        px: 0.5,
                        color: "text.secondary",
                        whiteSpace: "normal",
                      }}
                    >
                      Ждем ответ
                    </Typography>
                  </Stack>
                ) : (
                  <Button
                    size="small"
                    variant="text"
                    onClick={(event) => {
                      event.stopPropagation();
                      onReply(item);
                    }}
                    sx={{
                      flexShrink: 0,
                      whiteSpace: "normal",
                      backgroundColor: "grey.100",
                      "&:hover": {
                        backgroundColor: "primary.main",
                        color: "primary.contrastText",
                      },
                    }}
                  >
                    Ответить
                  </Button>
                )}
              </Stack>
            </>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
}

function BoardColumn({
  column,
  deletingId,
  sendingId,
  onOpen,
  onDelete,
  onReply,
}: {
  column: CustomerRequestBoardColumn;
  deletingId: string | null;
  sendingId: string | null;
  onOpen: (item: RequestCustomerDto) => void;
  onDelete: (item: RequestCustomerDto) => void;
  onReply: (item: RequestCustomerDto) => void;
}) {
  return (
    <Stack
      spacing={1}
      sx={{
        flex: { xs: "none", md: "1 0 320px" },
        minWidth: { xs: 0, md: 320 },
        width: { xs: "100%", md: 320 },
      }}
    >
      <Box
        sx={{
          width: 1,
          textAlign: "center",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          py: 1,
          px: 1,
          borderRadius: 0,
          fontWeight: 600,
          fontSize: "1rem",
          lineHeight: 1.5,
        }}
      >
        {column.label} · {column.items.length}
      </Box>
      <Stack spacing={1.25}>
        {column.items.map((item) => (
          <BoardCard
            key={item.id}
            item={item}
            deleting={deletingId === item.id}
            sending={sendingId === item.id}
            onOpen={onOpen}
            onDelete={onDelete}
            onReply={onReply}
          />
        ))}
      </Stack>
    </Stack>
  );
}

export function CustomerRequestsBoard({
  items,
  deletingId,
  sendingId = null,
  onOpen,
  onDelete,
  onReply,
}: Props) {
  const columns = groupCustomerRequestsByStatus(items);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "stretch",
        gap: 2,
        width: "100%",
        overflowX: "auto",
        pb: 1,
      }}
    >
      {columns.flatMap((column, index) => [
        ...(index > 0
          ? [
              <Divider
                key={`${column.status}-divider`}
                orientation="vertical"
                flexItem
                sx={{
                  display: { xs: "none", md: "block" },
                  borderRightWidth: 1,
                  borderColor: brown[200],
                  borderStyle: "dashed",
                }}
              />,
            ]
          : []),
        <BoardColumn
          key={column.status}
          column={column}
          deletingId={deletingId}
          sendingId={sendingId}
          onOpen={onOpen}
          onDelete={onDelete}
          onReply={onReply}
        />,
      ])}
    </Box>
  );
}
