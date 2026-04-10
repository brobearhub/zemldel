import Link from "next/link";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";

export default function AdminIndexPage() {
  return (
    <main>
      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Администрирование платформы
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Управление справочниками и платформенными сущностями.
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            <Link href="/admin/services" style={{ textDecoration: "none" }}>
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
                <BuildIcon color="primary" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900 }}>Услуги</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Создание, редактирование и список
                  </Typography>
                </Box>
              </Paper>
            </Link>

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
                <FolderOutlinedIcon color="primary" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900 }}>Категории</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Дерево категорий услуг
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

