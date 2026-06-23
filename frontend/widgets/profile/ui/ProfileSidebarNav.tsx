"use client";

import Link from "next/link";
import {
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

export type ProfileNavSection = "profile" | "orders" | "requests" | "documents";

type Props = {
  selected: ProfileNavSection;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function ProfileSidebarNav({ selected, collapsed = false, onToggleCollapsed }: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        overflow: "hidden",
        borderColor: "divider",
        position: { md: "sticky" },
        top: { md: 112 },
      }}
    >
      <Box
        sx={{
          px: collapsed ? 1 : 2.5,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 1,
        }}
      >
        {collapsed ? null : (
          <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.08em" }}>
            Профиль
          </Typography>
        )}
        <Tooltip title={collapsed ? "Развернуть меню" : "Свернуть меню"}>
          <span>
            <IconButton
              size="small"
              aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
              onClick={onToggleCollapsed}
              disabled={!onToggleCollapsed}
            >
              {collapsed ? <ChevronLeftRoundedIcon fontSize="small" /> : <ChevronRightRoundedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Divider />

      <List dense disablePadding>
        {(() => {
          const isSelected = selected === "requests" || selected === "orders";
          const title = "Заявки — Все ваши заявки";
          const button = (
            <ListItemButton
              component={Link}
              href="/profile?section=requests"
              selected={isSelected}
              aria-label={collapsed ? title : undefined}
              sx={{
                px: collapsed ? 1 : 2.5,
                py: collapsed ? 1.25 : 1.5,
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                  "&:hover": { bgcolor: "action.selected" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? "unset" : 36, justifyContent: "center" }}>
                <AssignmentTurnedInOutlinedIcon />
              </ListItemIcon>
              {collapsed ? null : (
                <ListItemText
                  primary="Заявки"
                  secondary="Все ваши заявки"
                  primaryTypographyProps={{ fontWeight: isSelected ? 700 : 600 }}
                />
              )}
            </ListItemButton>
          );
          return collapsed ? (
            <Tooltip title={title} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })()}

        {(() => {
          const isSelected = selected === "documents";
          const title = "Документы — Личные документы";
          const button = (
            <ListItemButton
              component={Link}
              href="/profile?section=documents"
              selected={isSelected}
              aria-label={collapsed ? title : undefined}
              sx={{
                px: collapsed ? 1 : 2.5,
                py: collapsed ? 1.25 : 1.5,
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                  "&:hover": { bgcolor: "action.selected" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? "unset" : 36, justifyContent: "center" }}>
                <DescriptionOutlinedIcon />
              </ListItemIcon>
              {collapsed ? null : (
                <ListItemText
                  primary="Документы"
                  secondary="Личные документы"
                  primaryTypographyProps={{ fontWeight: isSelected ? 700 : 600 }}
                />
              )}
            </ListItemButton>
          );
          return collapsed ? (
            <Tooltip title={title} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })()}

        {(() => {
          const isSelected = selected === "profile";
          const title = "Профиль — Личные данные";
          const button = (
            <ListItemButton
              component={Link}
              href="/profile?section=profile"
              selected={isSelected}
              aria-label={collapsed ? title : undefined}
              sx={{
                px: collapsed ? 1 : 2.5,
                py: collapsed ? 1.25 : 1.5,
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                  "&:hover": { bgcolor: "action.selected" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? "unset" : 36, justifyContent: "center" }}>
                <PersonOutlineOutlinedIcon />
              </ListItemIcon>
              {collapsed ? null : (
                <ListItemText
                  primary="Профиль"
                  secondary="Личные данные"
                  primaryTypographyProps={{ fontWeight: isSelected ? 700 : 600 }}
                />
              )}
            </ListItemButton>
          );
          return collapsed ? (
            <Tooltip title={title} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })()}
      </List>
    </Paper>
  );
}

