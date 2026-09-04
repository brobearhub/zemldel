"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";

export default function WelcomePage() {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        backgroundImage: "url('/hero-bg-house_static.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Paper
        elevation={10}
        sx={{
          width: "100%",
          maxWidth: 440,
          p: 4,
          backdropFilter: "blur(3px)",
          backgroundColor: "background.paper",
        }}
      >
        <Stack spacing={3} sx={{
          alignItems: "center"
        }}>
          <Box
            sx={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF6B35 0%, #F7C59F 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(255, 107, 53, 0.35)",
            }}
          >
            <CelebrationRoundedIcon sx={{ fontSize: 48, color: "#fff" }} />
          </Box>

          <Stack spacing={1} sx={{
            alignItems: "center"
          }}>
            <Typography variant="h4" align="center" sx={{
              fontWeight: 700
            }}>
              Поздравляем!
            </Typography>
          </Stack>

          <Stack spacing={1.5} sx={{
            width: "100%"
          }}>
            <Button
              component={Link}
              href="/profile"
              variant="contained"
              size="large"
              fullWidth
              startIcon={<PersonRoundedIcon />}
              sx={{ py: 1.5 }}
              color="secondary"
            >
              Перейти в профиль
            </Button>
          </Stack>

          <Divider sx={{ width: "100%" }} />


          <Stack spacing={1.5} sx={{
            width: "100%"
          }}>
            <Typography variant="body2" align="center" sx={{
              color: "text.secondary"
            }}>
              Создайте профессиональный профиль, чтобы предлагать услуги и работать от имени компании в отдельном кабинете.
            </Typography>
            <Button
              component={Link}
              href="/providers/new"
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<BusinessCenterRoundedIcon />}
              sx={{ py: 1.5 }}
            >
              Стать исполнителем
            </Button>
            <Typography variant="caption" align="center" sx={{
              color: "text.secondary"
            }}>
              Самозанятый, ИП или организация
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
