import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { CHAT_ARCHIVED_REASON_CODE } from "@/widgets/chat/model/chat-access";

type Props = {
  readonly message: string;
  readonly reasonCode?: string;
  readonly onOpenSelectedConversation?: () => void;
};

export function ChatReadOnlyNotice({
  message,
  reasonCode,
  onOpenSelectedConversation,
}: Props) {
  return (
    <Alert severity="info" variant="outlined" sx={reasonCode === CHAT_ARCHIVED_REASON_CODE ? { color: "text.secondary", borderColor: "divider", bgcolor: "action.hover", "& .MuiAlert-icon": { color: "text.secondary" } } : undefined}>
      <Stack spacing={1}>
        <Typography variant="body2">{message}</Typography>
        {reasonCode === CHAT_ARCHIVED_REASON_CODE &&
        onOpenSelectedConversation ? (
          <Box>
            <Button
              size="small"
              variant="outlined"
              onClick={onOpenSelectedConversation}
            >
              Перейти к выбранному исполнителю
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Alert>
  );
}
