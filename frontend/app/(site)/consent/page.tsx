import { Alert, Container, Paper, Stack, Typography } from "@mui/material";
import { sitePageContainerSx } from "@/shared/config/site-layout";
import { loadLegalDoc } from "@/shared/lib/server";
import { Markdown } from "@/shared/ui/Markdown";

export default async function ConsentPage() {
  let error: string | null = null;
  let markdown: string | null = null;
  let version: string | null = null;
  let title = "Согласие на обработку персональных данных";

  try {
    const doc = await loadLegalDoc("consent");
    markdown = doc.markdown;
    version = doc.version;
    title = doc.title;
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось загрузить согласие";
  }

  return (
    <Container maxWidth="md" sx={sitePageContainerSx}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h4" component="h1" fontWeight={800}>
              {title}
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
