"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Divider,
  Menu,
  MenuItem,
  Tooltip,
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
import { getActiveMembership, resolveAccountKind } from "@/core/auth/authorization";
import {
  formatProviderIdentity,
  formatSurnameInitials,
  type ProviderIdentity,
} from "@/entities/provider/lib/provider-identity";
import { resolveProfileMenuSection } from "../lib/profile-menu-section";
import {
  formatContactShortName,
  readProviderMenuMode,
  resolveProviderMenuMode,
  saveProviderMenuMode,
  type ProviderMenuMode,
} from "../lib/provider-menu-mode";

const CONTACT_PROFILE_HREF = "/profile?section=profile";

function getInitials(name: string | null | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

type ProfileMenuProps = {
  /** Подпись под иконкой — только для основного site-хедера и drawer. */
  readonly showLabel?: boolean;
  /** В меню-гамбургере подпись видна и на узком экране. */
  readonly forceLabel?: boolean;
  readonly onNavigate?: () => void;
  /**
   * В выезжающем меню пункты раскрываются списком.
   * На десктопе остаётся всплывающее окно.
   */
  readonly layout?: "popover" | "inline" | "sheet";
  /** Кнопка-аватар в шапке: открывает меню, само окно не показывает. */
  readonly onPress?: () => void;
};

function buildReturnTo(pathname: string, searchParams: { toString(): string }): string {
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const menuIconSx = { mr: 1.5, fontSize: 20 } as const;

/** Why: outline не входит в размер аватара и не сдвигает шапку. */
const proAvatarRingSx = {
  outline: "2px solid",
  outlineColor: "text.primary",
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

/** Название пункта с подписью мелким шрифтом сверху: «Организация» / «ООО Бурый Медведь». */
function IdentityLabel({ identity }: { readonly identity: ProviderIdentity }) {
  return (
    <Box component="span" sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      {identity.kindLabel ? (
        <Box
          component="span"
          sx={{ fontSize: 11, fontWeight: 400, lineHeight: 1.2, color: "text.secondary" }}
        >
          {identity.kindLabel}
        </Box>
      ) : null}
      <Box
        component="span"
        sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {identity.title}
      </Box>
    </Box>
  );
}

const drawerRowSx = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 1.5,
  width: "100%",
  px: 1,
  py: 0.75,
  border: 0,
  borderRadius: 1,
  bgcolor: "transparent",
  cursor: "pointer",
  textAlign: "left",
  textDecoration: "none",
  color: "common.gray",
  fontWeight: 600,
  fontSize: 12,
  "&:hover": {
    color: "info.main",
    "& .MuiSvgIcon-root": { color: "info.main" },
  },
} as const;

export const ProfileMenu = ({
  showLabel = false,
  forceLabel = false,
  onNavigate,
  layout = "popover",
  onPress,
}: ProfileMenuProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, user } = useAppSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const isAuthenticated = status === "authenticated";
  const accountKind = resolveAccountKind(user);
  const isProviderAccount = accountKind === "PROVIDER";
  const isPlatformAdmin = user?.systemRole === "PLATFORM_ADMIN";
  const activeSection = resolveProfileMenuSection(pathname);
  const [storedProviderMode, setStoredProviderMode] = useState<ProviderMenuMode | null>(null);
  /** Why: исполнитель переключается между кабинетом и контактным лицом — у заказчика режима нет. */
  const providerMode = isProviderAccount
    ? resolveProviderMenuMode(activeSection, storedProviderMode)
    : null;
  const activeMembership = isProviderAccount ? getActiveMembership(user) : null;
  const providerIdentity = activeMembership ? formatProviderIdentity(activeMembership) : null;
  /**
   * Why: у аккаунта с исполнителем человек — контактное лицо: подпись и «Фамилия И. О.», как в документах.
   * У заказчика остаётся «Имя Ф.».
   */
  const contactIdentity: ProviderIdentity = {
    kindLabel: isProviderAccount ? "Контактное лицо" : null,
    title:
      (isProviderAccount
        ? formatSurnameInitials(user?.person, user?.name)
        : formatContactShortName(user?.name)) ||
      user?.email ||
      "Пользователь",
    initials:
      (user?.person ? getInitials(`${user.person.firstName} ${user.person.lastName}`) : getInitials(user?.name)) ||
      user?.email?.charAt(0)?.toUpperCase() ||
      "U",
  };
  const isProviderIdentity = providerMode === "provider" && providerIdentity !== null;
  const currentIdentity = isProviderIdentity ? providerIdentity : contactIdentity;
  const showCustomerCabinet = !isProviderAccount;
  /** Why: пункт ведёт в другой раздел — на странице самого раздела он лишний, на публичных страницах нужны оба. */
  const showContactProfile = isProviderAccount && activeSection !== "profile";
  const showProviderCabinet = isProviderAccount ? activeSection !== "pro" : isPlatformAdmin;
  const showProRing = providerMode ? isProviderIdentity : activeSection === "pro";
  /** Why: в кабинете аватар принадлежит исполнителю, а не фото контактного лица. */
  const avatarSrc = (isProviderIdentity ? activeMembership?.providerImage : user?.image) || undefined;
  const initials = currentIdentity.initials;
  const [inlineOpen, setInlineOpen] = useState(false);
  const isInline = layout === "inline";
  /** Why: в drawer гость ищет вход, а не «профиль», которого ещё нет. */
  const triggerLabel = !isAuthenticated
    ? isInline
      ? "Войти"
      : "Профиль"
    : isProviderAccount
      ? currentIdentity.title
      : activeSection === "pro"
        ? "Кабинет исполнителя"
        : "Профиль";
  const avatarTooltip = isProviderAccount
    ? [currentIdentity.kindLabel, currentIdentity.title].filter(Boolean).join(" · ")
    : activeSection === "pro"
      ? "Кабинет исполнителя"
      : "";
  const providerCabinetLabel = providerIdentity ? (
    <IdentityLabel identity={providerIdentity} />
  ) : (
    "Кабинет исполнителя"
  );
  const contactProfileLabel = <IdentityLabel identity={contactIdentity} />;

  const handleMouseEnter = (event: MouseEvent<HTMLElement>) => {
    if (isInline || onPress) return;
    setAnchorEl(event.currentTarget);
  };

  const handleOpenOnClick = (event: MouseEvent<HTMLElement>) => {
    if (onPress) {
      onPress();
      return;
    }
    if (isInline) {
      setInlineOpen((value) => !value);
      return;
    }
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const closeAndGo = (go: () => void) => {
    handleClose();
    onNavigate?.();
    go();
  };

  useEffect(() => {
    if (!isProviderAccount) return;
    if (activeSection === "pro") saveProviderMenuMode("provider");
    if (activeSection === "profile") saveProviderMenuMode("contact");
    setStoredProviderMode(readProviderMenuMode());
  }, [isProviderAccount, activeSection]);

  const handleCustomerProfile = () => {
    closeAndGo(() => router.push("/profile"));
  };

  const handleContactProfile = () => {
    saveProviderMenuMode("contact");
    closeAndGo(() => router.push(CONTACT_PROFILE_HREF));
  };

  const handleSignOut = async () => {
    handleClose();
    onNavigate?.();
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  const handleSignIn = () => {
    const returnTo = buildReturnTo(pathname, searchParams);
    closeAndGo(() => router.push(`/signin?returnTo=${encodeURIComponent(returnTo)}`));
  };

  const handleSignInPro = () => {
    closeAndGo(() => router.push(`/signin?returnTo=${encodeURIComponent("/pro")}`));
  };

  const handleSignUp = () => {
    closeAndGo(() => router.push("/signup"));
  };

  const handleProDashboard = () => {
    if (isProviderAccount) saveProviderMenuMode("provider");
    closeAndGo(() => router.push("/pro"));
  };

  const handleAdmin = () => {
    closeAndGo(() => router.push("/admin"));
  };

  /** Why: в sheet пункты — сам список drawer, во inline они вложены под кнопку и остаются с отступом. */
  const actionsListSx = {
    display: "flex",
    flexDirection: "column",
    gap: 0.5,
    pl: layout === "sheet" ? 0 : 1,
  } as const;
  const rowSx = layout === "sheet" ? { ...drawerRowSx, px: 0 } : drawerRowSx;

  const inlineActions = isAuthenticated ? (
    <Box sx={actionsListSx}>
      {showCustomerCabinet ? (
        <Box component="button" type="button" onClick={handleCustomerProfile} sx={rowSx}>
          <PersonOutlineRoundedIcon sx={{ fontSize: 22 }} />
          Мой профиль
        </Box>
      ) : null}
      {showProviderCabinet ? (
        <Box component="button" type="button" onClick={handleProDashboard} sx={rowSx}>
          <WorkOutlineOutlinedIcon sx={{ fontSize: 22 }} />
          {providerCabinetLabel}
        </Box>
      ) : null}
      {showContactProfile ? (
        <Box component="button" type="button" onClick={handleContactProfile} sx={rowSx}>
          <PersonOutlineRoundedIcon sx={{ fontSize: 22 }} />
          {contactProfileLabel}
        </Box>
      ) : null}
      {isPlatformAdmin ? (
        <Box component="button" type="button" onClick={handleAdmin} sx={rowSx}>
          <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 22 }} />
          Админка
        </Box>
      ) : null}
      <Box component="button" type="button" onClick={handleSignOut} sx={{ ...rowSx, color: "error.main" }}>
        <LogoutIcon sx={{ fontSize: 22 }} />
        Выйти
      </Box>
    </Box>
  ) : (
    <Box sx={actionsListSx}>
      <Box component="button" type="button" onClick={handleSignIn} sx={rowSx}>
        <LoginIcon sx={{ fontSize: 22 }} />
        Клиент
      </Box>
      <Box component="button" type="button" onClick={handleSignInPro} sx={rowSx}>
        <WorkOutlineOutlinedIcon sx={{ fontSize: 22 }} />
        Исполнитель
      </Box>
      {isInline ? null : (
        <Box component="button" type="button" onClick={handleSignUp} sx={rowSx}>
          <PersonAddIcon sx={{ fontSize: 22 }} />
          Регистрация
        </Box>
      )}
    </Box>
  );

  if (layout === "sheet") {
    return inlineActions;
  }

  return (
    <Box
      onMouseEnter={isInline || onPress ? undefined : handleMouseEnter}
      onMouseLeave={isInline || onPress ? undefined : handleClose}
      sx={{ position: "relative" }}
    >
      <Box
        component="button"
        id={onPress ? undefined : "profile-button"}
        onClick={handleOpenOnClick}
        aria-label={triggerLabel}
        aria-controls={!isInline && open ? "profile-menu" : undefined}
        aria-haspopup={isInline || onPress ? undefined : "true"}
        aria-expanded={isInline ? inlineOpen : open ? "true" : undefined}
        sx={{
          display: "flex",
          flexDirection: forceLabel ? "row" : "column",
          alignItems: "center",
          justifyContent: forceLabel ? "flex-start" : "center",
          gap: forceLabel ? 1.5 : 0.25,
          minWidth: 44,
          minHeight: 44,
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
          <Tooltip title={avatarTooltip}>
            <CdnAvatar
            src={avatarSrc}
            sx={{
              width: { xs: 28, sm: 32 },
              height: { xs: 28, sm: 32 },
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontSize: { xs: 12, sm: 13 },
              fontWeight: 600,
              ...(showProRing ? proAvatarRingSx : null),
            }}
          >
            {initials}
          </CdnAvatar>
          </Tooltip>
        ) : (
          <PersonOutlineRoundedIcon sx={{ fontSize: { xs: 22, sm: 24 }, color: "info.main" }} />
        )}
        {showLabel ? (
          <Typography
            className="nav-label"
            variant="body2"
            noWrap
            sx={{
              color: "common.gray",
              display: forceLabel ? "block" : { xs: "none", md: "block" },
              maxWidth: forceLabel ? "100%" : 180,
              fontWeight: 600,
              fontSize: 12,
              opacity: 1,
              "&:hover": { color: "info.main" }
            }}>
            {triggerLabel}
          </Typography>
        ) : null}
      </Box>

      {isInline && inlineOpen ? inlineActions : null}

      {!isInline && !onPress ? (
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableScrollLock
        disableAutoFocusItem
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
              maxWidth: 320,
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
                  src={avatarSrc}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "primary.main",
                    fontSize: 16,
                    fontWeight: 600,
                    ...(showProRing ? proAvatarRingSx : null),
                  }}
                >
                  {initials}
                </CdnAvatar>
                <Box sx={{ minWidth: 0 }}>
                  {currentIdentity.kindLabel ? (
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ color: "text.secondary", display: "block", lineHeight: 1.2 }}
                    >
                      {currentIdentity.kindLabel}
                    </Typography>
                  ) : null}
                  <Typography variant="subtitle2" noWrap sx={{
                    fontWeight: 600
                  }}>
                    {currentIdentity.title}
                  </Typography>
                  {user?.email && user.email !== currentIdentity.title ? (
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        color: "text.secondary",
                        display: "block"
                      }}>
                      {user.email}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            </Box>
            <Divider />
            {showCustomerCabinet ? (
              <SectionMenuItem
                active={activeSection === "profile"}
                onClick={handleCustomerProfile}
                outlineIcon={<PersonOutlineRoundedIcon sx={menuIconSx} />}
                filledIcon={<PersonRoundedIcon sx={menuIconSx} />}
              >
                Мой профиль
              </SectionMenuItem>
            ) : null}
            {showProviderCabinet ? (
              <SectionMenuItem
                active={activeSection === "pro"}
                onClick={handleProDashboard}
                outlineIcon={<WorkOutlineOutlinedIcon sx={menuIconSx} />}
                filledIcon={<WorkIcon sx={menuIconSx} />}
              >
                {providerCabinetLabel}
              </SectionMenuItem>
            ) : null}
            {showContactProfile ? (
              <SectionMenuItem
                active={false}
                onClick={handleContactProfile}
                outlineIcon={<PersonOutlineRoundedIcon sx={menuIconSx} />}
                filledIcon={<PersonRoundedIcon sx={menuIconSx} />}
              >
                {contactProfileLabel}
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
                Войти
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleSignIn} sx={menuItemSx(false)}>
              <LoginIcon sx={menuIconSx} />
              Клиент
            </MenuItem>
            <MenuItem onClick={handleSignInPro} sx={menuItemSx(false)}>
              <WorkOutlineOutlinedIcon sx={menuIconSx} />
              Исполнитель
            </MenuItem>
            <MenuItem onClick={handleSignUp} sx={menuItemSx(false)}>
              <PersonAddIcon sx={menuIconSx} />
              Регистрация
            </MenuItem>
          </Box>
        )}
      </Menu>
      ) : null}
    </Box>
  );
};
