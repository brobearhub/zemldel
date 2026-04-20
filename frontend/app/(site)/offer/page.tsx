import { Alert, Container, Paper, Stack, Typography } from "@mui/material";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CURRENT_PUBLIC_OFFER_VERSION = "2026-04-19" as const;
const CURRENT_PUBLIC_OFFER_DOC = `public-offer-${CURRENT_PUBLIC_OFFER_VERSION}.md` as const;

export default async function PublicOfferPage() {
  let error: string | null = null;
  let markdown: string | null = null;

  try {
    const candidates = [
      resolve(process.cwd(), "..", "docs", CURRENT_PUBLIC_OFFER_DOC),
      resolve(process.cwd(), "docs", CURRENT_PUBLIC_OFFER_DOC),
    ];

    let loaded: string | null = null;
    for (const absolute of candidates) {
      try {
        loaded = await readFile(absolute, "utf-8");
        break;
      } catch {
        // try next candidate
      }
    }

    if (!loaded) {
      throw new Error(`Public offer file not found: ${CURRENT_PUBLIC_OFFER_DOC}`);
    }

    markdown = loaded;
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось загрузить оферту";
  }

  return (
    <Container maxWidth="md" sx={{ py: 4, pt: 14, pb: 10 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h4" component="h1" fontWeight={800}>
              Публичная оферта
            </Typography>
            {CURRENT_PUBLIC_OFFER_VERSION ? (
              <Typography variant="body2" color="text.secondary">
                Версия: {CURRENT_PUBLIC_OFFER_VERSION}
              </Typography>
            ) : null}
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {markdown ? (
            <Typography sx={{ whiteSpace: "pre-wrap" }}>{markdown}</Typography>
          ) : null}
        </Stack>
      </Paper>
    </Container>
  );
}

