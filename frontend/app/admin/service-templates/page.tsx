import Link from "next/link";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";

export default function AdminServiceTemplatesPage() {
  return (
    <main>
      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Шаблонные услуги
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Каталог платформенных шаблонов, из которых провайдеры создают свои услуги.
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            <Link href="/admin/service-templates/list" style={{ textDecoration: "none" }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  color: "inherit",
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <FormatListBulletedIcon color="primary" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900 }}>Список</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Просмотр, создание и удаление
                  </Typography>
                </Box>
              </Paper>
            </Link>
          </Box>
        </Stack>
      </Container>
    </main>
  );
}

