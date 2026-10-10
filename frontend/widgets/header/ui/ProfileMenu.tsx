"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Divider,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import WorkIcon from "@mui/icons-material/Work";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { signOut } from "next-auth/react";
import { useAppSelector } from "@/core/store/hooks";
import { CdnAvatar } from "@/shared/ui/cdn-image";
import { resolveProfileMenuSection } from "../lib/profile-menu-section";

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

function buildReturnTo(pathname: string, searchParams: { toString(): string }): string {
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const menuIconSx = { mr: 1.5, fontSize: 20 } as const;

/** Why: outline не входит в размер аватара и не сдвигает шапку. */
const proAvatarRingSx = {
  outline: "2px dashed",
  outlineColor: "accent.main",
  outlineOffset: "2px",
} as const;

function menuItemSx(active: boolean) {
  return {
    py: 1.5,
    fontWeight: active ? 600 : 400,
    "&&:hover, &&.Mui-focusVisible": {
      bgcolor: "primary.main",
      color: "common.black",
      "& .MuiSvgIcon-root": { color: "common.black" },
    },
  };
}

type SectionMenuItemProps = {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly outlineIcon: ReactNode;
  readonly filledIcon: ReactNode;
  readonly children: ReactNode;
};

function SectionMenuItem({
  active,
  onClick,
  outlineIcon,
  filledIcon,
  children,
}: SectionMenuItemProps) {
  return (
    <MenuItem
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      sx={menuItemSx(active)}
    >
      {active ? filledIcon : outlineIcon}
      {children}
    </MenuItem>
  );
}

export const ProfileMenu = ({ showLabel = false }: ProfileMenuProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, user } = useAppSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const isAuthenticated = status === "authenticated";
  const hasProfessionalProfile = (user?.memberships?.length ?? 0) > 0;
  const isPlatformAdmin = user?.systemRole === "PLATFORM_ADMIN";
  const activeSection = resolveProfileMenuSection(pathname);
  const initials = getInitials(user?.name) || user?.email?.charAt(0)?.toUpperCase() || "U";

  const handleMouseEnter = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleOpenOnClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCustomerProfile = () => {
    handleClose();
    router.push("/profile");
  };

  const handleSignOut = async () => {
    handleClose();
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  const handleSignIn = () => {
    handleClose();
    const returnTo = buildReturnTo(pathname, searchParams);
    router.push(`/signin?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleSignInPro = () => {
    handleClose();
    router.push(`/signin?returnTo=${encodeURIComponent("/pro")}`);
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
        id="profile-button"
        onClick={handleOpenOnClick}
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
          borderRadius: 1,
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
          <CdnAvatar
            src={user?.image || undefined}
            sx={{
              width: { xs: 28, sm: 32 },
              height: { xs: 28, sm: 32 },
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontSize: { xs: 12, sm: 13 },
              fontWeight: 600,
              ...(activeSection === "pro" ? proAvatarRingSx : null),
            }}
          >
            {initials}
          </CdnAvatar>
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
              borderRadius: 1,
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
                <CdnAvatar
                  src={user?.image || undefined}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "primary.main",
                    fontSize: 16,
                    fontWeight: 600,
                    ...(activeSection === "pro" ? proAvatarRingSx : null),
                  }}
                >
                  {initials}
                </CdnAvatar>
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
            <SectionMenuItem
              active={activeSection === "profile"}
              onClick={handleCustomerProfile}
              outlineIcon={<PersonOutlineRoundedIcon sx={menuIconSx} />}
              filledIcon={<PersonRoundedIcon sx={menuIconSx} />}
            >
              Мой профиль
            </SectionMenuItem>
            {hasProfessionalProfile ? (
              <SectionMenuItem
                active={activeSection === "pro"}
                onClick={handleProDashboard}
                outlineIcon={<WorkOutlineOutlinedIcon sx={menuIconSx} />}
                filledIcon={<WorkIcon sx={menuIconSx} />}
              >
                Кабинет профессионала
              </SectionMenuItem>
            ) : null}
            {isPlatformAdmin ? (
              <SectionMenuItem
                active={activeSection === "admin"}
                onClick={handleAdmin}
                outlineIcon={<AdminPanelSettingsOutlinedIcon sx={menuIconSx} />}
                filledIcon={<AdminPanelSettingsIcon sx={menuIconSx} />}
              >
                Админка
              </SectionMenuItem>
            ) : null}
            <MenuItem onClick={handleSignOut} sx={{ ...menuItemSx(false), color: "error.main" }}>
              <LogoutIcon sx={menuIconSx} />
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
            <MenuItem onClick={handleSignIn} sx={menuItemSx(false)}>
              <LoginIcon sx={menuIconSx} />
              Войти
            </MenuItem>
            <MenuItem onClick={handleSignInPro} sx={menuItemSx(false)}>
              <WorkOutlineOutlinedIcon sx={menuIconSx} />
              Войти исполнителю
            </MenuItem>
            <MenuItem onClick={handleSignUp} sx={menuItemSx(false)}>
              <PersonAddIcon sx={menuIconSx} />
              Регистрация
            </MenuItem>
          </Box>
        )}
      </Menu>
    </Box>
  );
};
