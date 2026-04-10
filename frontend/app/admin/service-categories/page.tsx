import Link from "next/link";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";

export default function AdminServiceCategoriesPage() {
  return (
    <main>
      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Категории услуг
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Управление деревом категорий, используемым для услуг провайдеров.
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
            <Link href="/admin/service-categories/list" style={{ textDecoration: "none" }}>
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
                  <Typography sx={{ fontWeight: 900 }}>Дерево</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Просмотр и редактирование
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

