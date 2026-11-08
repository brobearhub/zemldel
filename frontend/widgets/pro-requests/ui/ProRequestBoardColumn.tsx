import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import type { RequestStatus } from "@/entities/request";
import type { ProRequestBoardColumn as BoardColumn } from "@/widgets/pro-requests/lib/group-requests-by-status";
import { ProRequestBoardCard } from "./ProRequestBoardCard";

const STATUS_COLORS: Record<RequestStatus, string> = {
  NEW: "#e8a840",
  DISCUSSING: "#579bd2",
  TERMS_AGREED: "#8f86bc",
  ACTIVE: "#548a5c",
  ACCEPTANCE_PENDING: "#b08b4f",
  ACCEPTED: "#6c9c85",
  COMPLETED: "#799382",
  CANCELLED: "#b77979",
  CLOSED: "#92978e",
};

export function ProRequestBoardColumn({ column }: { column: BoardColumn }) {
  const color = STATUS_COLORS[column.status];
  return (
    <Stack
      component="section"
      aria-label={`${column.label}: ${column.items.length}`}
      spacing={1.5}
      sx={{
        minWidth: 0,
        width: "100%",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          minHeight: 32,
          px: 1,
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            flexShrink: 0,
            bgcolor: color,
          }}
        />
        <Typography
          component="h2"
          sx={{
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {column.label}
        </Typography>
        <Box
          component="span"
          sx={{
            px: 0.875,
            py: 0.125,
            borderRadius: 4,
            bgcolor: alpha(color, 0.16),
            fontSize: 13,
            fontWeight: 700,
            color: "text.primary",
          }}
        >
          {column.items.length}
        </Box>
      </Stack>
      {column.items.length ? column.items.map((item) => (
        <ProRequestBoardCard key={item.id} item={item} />
      )) : (
        <Stack
          spacing={1}
          sx={{
            minHeight: { xs: 180, md: 340 },
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 24 }} />
          <Typography
            variant="body2"
            sx={{
              fontSize: 14,
              textAlign: "center",
            }}
          >
            Нет заявок в этом статусе
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
