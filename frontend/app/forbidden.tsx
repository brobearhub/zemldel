import { Box, Button, Stack, Typography } from "@mui/material";

export default function ForbiddenPage() {
  return (
    <Box component="main" sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", px: 2 }}>
      <Stack spacing={2} sx={{ maxWidth: 420, textAlign: "center", alignItems: "center" }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 900 }}>
          Нет доступа
        </Typography>
        <Typography>
          Эта страница только для администраторов.
        </Typography>
        <Button component="a" href="/pro" variant="contained" sx={{ minHeight: 44 }}>
          В кабинет
        </Button>
      </Stack>
    </Box>
  );
}
