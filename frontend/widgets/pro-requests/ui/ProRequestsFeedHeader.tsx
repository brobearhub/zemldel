import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

type Props = {
  onRefresh: () => void;
  canCreateClientRequest?: boolean;
  refreshing?: boolean;
};

export function ProRequestsFeedHeader({ onRefresh, refreshing = false, canCreateClientRequest }: Props) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      sx={{
        justifyContent: "space-between",
        alignItems: { md: "center" },
      }}
    >
      <Box
        sx={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <Typography
          component="h1"
          variant="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            fontSize: { xs: 28, md: 32 },
          }}
        >
          Доска заявок
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
          }}
        >
          Здесь собраны заявки по вашим услугам, свободные заявки и заявки, созданные вашей командой для клиентов.
        </Typography>
      </Box>
      {canCreateClientRequest && <Button component={Link} href="/pro/requests/new" variant="contained">Создать заявку для клиента</Button>}
      <Button
        variant="outlined"
        size="small"
        startIcon={<RefreshRoundedIcon />}
        onClick={onRefresh}
        disabled={refreshing}
        sx={{
          whiteSpace: "nowrap",
          flexShrink: 0,
          alignSelf: { xs: "flex-start", md: "center" },
          bgcolor: "background.paper",
          color: "text.primary",
          borderColor: "divider",
        }}
      >
        {refreshing ? "Обновление…" : "Обновить"}
      </Button>
    </Stack>
  );
}
