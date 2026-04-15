import { Box, Button, Stack, Typography } from "@mui/material";

type Props = {
  onRefresh: () => void;
};

export function ProRequestsFeedHeader({ onRefresh }: Props) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Лента заявок
        </Typography>
        <Typography color="text.secondary">
          Здесь появляются заявки клиентов: по категориям ваших услуг и свободные заявки с главной страницы.
        </Typography>
      </Box>
      <Button variant="outlined" onClick={onRefresh} sx={{ whiteSpace: "nowrap" }}>
        Обновить
      </Button>
    </Stack>
  );
}

