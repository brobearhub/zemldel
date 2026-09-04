import { Box, Button, Stack, Typography } from "@mui/material";

type Props = {
  onRefresh: () => void;
};

export function ProRequestsFeedHeader({ onRefresh }: Props) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      sx={{
        justifyContent: "space-between",
        alignItems: { md: "center" }
      }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{
          fontWeight: 700
        }}>
          Лента заявок
        </Typography>
        <Typography sx={{
          color: "text.secondary"
        }}>
          Здесь появляются заявки клиентов: по категориям ваших услуг и свободные заявки с главной страницы.
        </Typography>
      </Box>
      <Button variant="outlined" onClick={onRefresh} sx={{ whiteSpace: "nowrap" }}>
        Обновить
      </Button>
    </Stack>
  );
}

