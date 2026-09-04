"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  Divider,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { signOut } from "next-auth/react";
import { useAppSelector } from "@/core/store/hooks";

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

type ProfileMenuProps = {
  /** Подпись «Профиль» под иконкой — только для основного site-хедера. */
  readonly showLabel?: boolean;
};

export const ProfileMenu = ({ showLabel = false }: ProfileMenuProps) => {
  const router = useRouter();
  const { status, user } = useAppSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const isAuthenticated = status === "authenticated";
  const hasProfessionalProfile = (user?.memberships?.length ?? 0) > 0;
  const isPlatformAdmin = user?.systemRole === "PLATFORM_ADMIN";
  const initials = getInitials(user?.name) || user?.email?.charAt(0)?.toUpperCase() || "U";

  const handleMouseEnter = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClick = () => {
    if (status === "authenticated") {
      router.push("/profile");
    } else {
      router.push("/signin");
    }
    handleClose();
  };

  const handleSignOut = async () => {
    handleClose();
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  const handleSignIn = () => {
    handleClose();
    router.push("/signin");
  };

  const handleSignUp = () => {
    handleClose();
    router.push("/signup");
  };

  const handleProDashboard = () => {
    handleClose();
    router.push("/pro");
  };

  const handleAdmin = () => {
    handleClose();
    router.push("/admin");
  };

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleClose}
      sx={{ position: "relative" }}
    >
      <Box
        component="button"
        onClick={handleClick}
        aria-label="Профиль"
        aria-controls={open ? "profile-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.25,
          px: { xs: 0.75, sm: 1 },
          py: 0.75,
          borderRadius: 1.5,
          textDecoration: "none",
          cursor: "pointer",
          background: "none",
          border: "none",
          "&:hover": {
            color: "primary.main",
            "& .nav-label": { opacity: 1, color: "info.main" },
            "& .MuiSvgIcon-root": { color: "info.main" },
            "& .MuiTypography-root": { color: "info.main" },
          },
        }}
      >
        {isAuthenticated ? (
          <Avatar
            src={user?.image || undefined}
            sx={{
              width: { xs: 28, sm: 32 },
              height: { xs: 28, sm: 32 },
              bgcolor: "primary.main",
              color: "common.white",
              fontSize: { xs: 12, sm: 13 },
              fontWeight: 600,
            }}
          >
            {initials}
          </Avatar>
        ) : (
          <PersonOutlineRoundedIcon sx={{ fontSize: { xs: 22, sm: 24 }, color: "info.main" }} />
        )}
        {showLabel ? (
          <Typography
            className="nav-label"
            variant="body2"
            sx={{
              color: "common.gray",
              display: { xs: "none", md: "block" },
              fontWeight: 600,
              fontSize: 12,
              opacity: 1,
              "&:hover": { color: "info.main" }
            }}>
            Профиль
          </Typography>
        ) : null}
      </Box>

      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableScrollLock
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 220,
              borderRadius: 2,
              boxShadow: 3,
            },
          },

          list: {
            onMouseLeave: handleClose,
            "aria-labelledby": "profile-button",
          }
        }}>
        {isAuthenticated ? (
          <Box>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Avatar
                  src={user?.image || undefined}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "primary.main",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {initials}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap sx={{
                    fontWeight: 600
                  }}>
                    {user?.name || "Пользователь"}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      color: "text.secondary",
                      display: "block"
                    }}>
                    {user?.email}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Divider />
            <MenuItem onClick={handleClick} sx={{ py: 1.5 }}>
              <PersonOutlineRoundedIcon sx={{ mr: 1.5, fontSize: 20 }} />
              Мой профиль
            </MenuItem>
            {hasProfessionalProfile ? (
              <MenuItem onClick={handleProDashboard} sx={{ py: 1.5 }}>
                <WorkOutlineOutlinedIcon sx={{ mr: 1.5, fontSize: 20 }} />
                Кабинет профессионала
              </MenuItem>
            ) : null}
            {isPlatformAdmin ? (
              <MenuItem onClick={handleAdmin} sx={{ py: 1.5 }}>
                <AdminPanelSettingsOutlinedIcon sx={{ mr: 1.5, fontSize: 20 }} />
                Админка
              </MenuItem>
            ) : null}
            <MenuItem onClick={handleSignOut} sx={{ py: 1.5, color: "error.main" }}>
              <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
              Выйти
            </MenuItem>
          </Box>
        ) : (
          <Box>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" sx={{
                fontWeight: 600
              }}>
                Добро пожаловать!
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                Войдите или зарегистрируйтесь
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleSignIn} sx={{ py: 1.5 }}>
              <LoginIcon sx={{ mr: 1.5, fontSize: 20 }} />
              Войти
            </MenuItem>
            <MenuItem onClick={handleSignUp} sx={{ py: 1.5 }}>
              <PersonAddIcon sx={{ mr: 1.5, fontSize: 20 }} />
              Регистрация
            </MenuItem>
          </Box>
        )}
      </Menu>
    </Box>
  );
};
