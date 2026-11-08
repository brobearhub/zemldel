import { Box, Button, Stack, Typography } from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

type Props = {
  onRefresh: () => void;
  refreshing?: boolean;
};

export function ProRequestsFeedHeader({ onRefresh, refreshing = false }: Props) {
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
          Здесь появляются заявки клиентов: по категориям ваших услуг и
          свободные заявки с главной страницы.
        </Typography>
      </Box>
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
