"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import {
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlineOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useColorMode } from "@/core/theme/ColorModeContext";

const rowSx = {
  minHeight: 48,
  mx: 1,
  px: 2,
  borderRadius: 1,
  gap: 1.5,
  color: "text.secondary",
  "& .MuiListItemText-primary": {
    fontSize: 17,
  },
  "&.Mui-selected": {
    color: "text.primary",
    bgcolor: "action.selected",
  },
};

export function ProSettingsMenu({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const id = useId();
  const { mode, toggleMode } = useColorMode();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const link = (href: string, label: string, icon?: ReactNode) => (
    <ListItemButton
      key={href}
      component={Link}
      href={href}
      onClick={onNavigate}
      selected={pathname === href || pathname.startsWith(`${href}/`)}
      aria-current={pathname === href ? "page" : undefined}
      sx={{
        ...rowSx,
        pl: icon ? 2 : 6.5,
        "& .MuiListItemText-primary": {
          fontSize: icon ? 17 : 15,
        },
      }}
    >
      {icon && (
        <ListItemIcon sx={{ minWidth: 24, color: "inherit" }}>
          {icon}
        </ListItemIcon>
      )}
      <ListItemText primary={label} />
    </ListItemButton>
  );
  return (
    <List disablePadding aria-label="Разделы настроек">
      {link("/pro/settings/profile", "Мой профиль", <PersonOutlineIcon />)}
      {link("/pro/settings/account", "Мои данные", <PersonOutlineIcon />)}
      {link("/pro/settings/promotion", "Продвижение", <TrendingUpIcon />)}
      <ListItemButton
        onClick={() => setTemplatesOpen(!templatesOpen)}
        aria-expanded={templatesOpen}
        aria-controls={`${id}-templates`}
        sx={rowSx}
      >
        <ListItemIcon sx={{ minWidth: 24, color: "inherit" }}>
          <DescriptionOutlinedIcon />
        </ListItemIcon>
        <ListItemText primary="Шаблоны" />
        {templatesOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>
      <Collapse in={templatesOpen}>
        <Box id={`${id}-templates`}>
          {link("/pro/settings/templates/replies", "Ответы клиенту")}
          {link("/pro/settings/templates/stage-statuses", "Статусы этапов")}
        </Box>
      </Collapse>
      {link("/pro/settings/messengers", "Мессенджеры", <ChatOutlinedIcon />)}
      {link("/pro/settings/tariff", "Тариф", <LocalOfferOutlinedIcon />)}
      <ListItemButton
        role="switch"
        aria-label="Тема"
        aria-checked={mode === "dark"}
        onClick={toggleMode}
        sx={rowSx}
      >
        <ListItemIcon sx={{ minWidth: 24, color: "inherit" }}>
          <DarkModeOutlinedIcon />
        </ListItemIcon>
        <ListItemText primary="Тема" />
        <Switch
          checked={mode === "dark"}
          size="small"
          slotProps={{ input: { tabIndex: -1, "aria-hidden": true } }}
          sx={{ pointerEvents: "none" }}
        />
      </ListItemButton>
      <ListItemButton
        onClick={() => void signOut({ callbackUrl: "/" })}
        sx={{ ...rowSx, color: "error.main" }}
      >
        <ListItemIcon sx={{ minWidth: 24, color: "inherit" }}>
          <LogoutRoundedIcon />
        </ListItemIcon>
        <ListItemText primary="Выйти" />
      </ListItemButton>
    </List>
  );
}
