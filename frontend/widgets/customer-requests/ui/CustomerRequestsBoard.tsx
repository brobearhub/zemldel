"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { Box, Divider, IconButton, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatRequestDate, type RequestCustomerDto } from "@/entities/request";
import { toPublicAssetSrc } from "@/shared/lib/public-asset-src";
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
  onOpen: (item: RequestCustomerDto) => void;
  onDelete: (item: RequestCustomerDto) => void;
};

function cardToneBg(tone: CustomerRequestCardTone) {
  return (theme: { palette: { primary: { main: string }; action: { hover: string } } }) =>
    tone === "sage" ? alpha(theme.palette.primary.main, 0.18) : theme.palette.action.hover;
}

function BoardCard({
  item,
  deleting,
  onOpen,
  onDelete,
}: {
  item: RequestCustomerDto;
  deleting: boolean;
  onOpen: (item: RequestCustomerDto) => void;
  onDelete: (item: RequestCustomerDto) => void;
}) {
  const { title, letter, photo, metaName } = getCustomerRequestCardContent(item);
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
            width: 72,
            flexShrink: 0,
            bgcolor: cardToneBg(tone),
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          {photo ? (
            <Box
              component="img"
              src={toPublicAssetSrc(photo)}
              alt=""
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Typography
              aria-hidden
              sx={{
                color: "text.secondary",
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {letter}
            </Typography>
          )}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1, px: 1.5, py: 1.25 }}>
          <Typography
            noWrap
            title={title}
            sx={{
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.35,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            title={meta}
            sx={{
              color: "text.secondary",
              display: "block",
              mt: 0.75,
            }}
          >
            {meta}
          </Typography>
        </Box>
        <Box
          sx={{
            flexShrink: 0,
            minWidth: 56,
            px: 1.25,
            py: 1.25,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            {age.days}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              mt: 0.25,
            }}
          >
            {age.label}
          </Typography>
        </Box>
      </Stack>
      {item.canDeleteByCustomer ? (
        <IconButton
          size="small"
          color="error"
          aria-label="Удалить заявку"
          disabled={deleting}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item);
          }}
          sx={{ position: "absolute", top: 4, right: 4 }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      ) : null}
    </Paper>
  );
}

function BoardColumn({
  column,
  deletingId,
  onOpen,
  onDelete,
}: {
  column: CustomerRequestBoardColumn;
  deletingId: string | null;
  onOpen: (item: RequestCustomerDto) => void;
  onDelete: (item: RequestCustomerDto) => void;
}) {
  return (
    <Stack spacing={1} sx={{ flex: "1 1 0", minWidth: 200, width: 0 }}>
      <Box
        sx={{
          width: 1,
          textAlign: "center",
          bgcolor: brown[500],
          color: "white",
          py: 1,
          px: 1,
          borderRadius: 0,
          fontWeight: 600,
          fontSize: 14,
          lineHeight: 1,
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
            onOpen={onOpen}
            onDelete={onDelete}
          />
        ))}
      </Stack>
    </Stack>
  );
}

export function CustomerRequestsBoard({ items, deletingId, onOpen, onDelete }: Props) {
  const columns = groupCustomerRequestsByStatus(items);

  return (
    <Box
      sx={{
        display: "flex",
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
                sx={{ borderRightWidth: 1, borderColor: brown[200] }}
              />,
            ]
          : []),
        <BoardColumn
          key={column.status}
          column={column}
          deletingId={deletingId}
          onOpen={onOpen}
          onDelete={onDelete}
        />,
      ])}
    </Box>
  );
}
