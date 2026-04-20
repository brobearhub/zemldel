import { Container, Paper, Stack, Typography } from "@mui/material";

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4, pt: 14, pb: 10 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Typography variant="h4" component="h1" fontWeight={800}>
            Политика конфиденциальности
          </Typography>

          <Typography color="text.secondary">
            Текст политики конфиденциальности будет опубликован здесь.
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}

