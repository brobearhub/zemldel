import { Alert, Container, Paper, Stack, Typography } from "@mui/material";
import { loadLegalDoc } from "@/lib/legal-docs";
import { Markdown } from "@/shared/ui/Markdown";

export default async function PrivacyPolicyPage() {
  let error: string | null = null;
  let markdown: string | null = null;
  let version: string | null = null;

  try {
    const doc = await loadLegalDoc("privacy-policy");
    markdown = doc.markdown;
    version = doc.version;
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось загрузить политику конфиденциальности";
  }

  return (
    <Container maxWidth="md" sx={{ py: 4, pt: 14, pb: 10 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h4" component="h1" fontWeight={800}>
            Политика конфиденциальности
            </Typography>
            {version ? (
              <Typography variant="body2" color="text.secondary">
                Версия: {version}
              </Typography>
            ) : null}
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {markdown ? <Markdown markdown={markdown} skipFirstH1 /> : null}
        </Stack>
      </Paper>
    </Container>
  );
}

