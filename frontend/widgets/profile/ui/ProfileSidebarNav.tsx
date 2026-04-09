"use client";

import Link from "next/link";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";

export type ProfileNavSection = "profile" | "orders" | "requests";

type Props = {
  selected: ProfileNavSection;
};

function buildHref(section: ProfileNavSection) {
  return `/profile?section=${section}`;
}

export function ProfileSidebarNav({ selected }: Props) {
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
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.08em" }}>
          Профиль
        </Typography>
      </Box>

      <Divider />

      <List dense disablePadding>
        <ListItemButton
          component={Link}
          href={buildHref("orders")}
          selected={selected === "orders"}
          sx={{
            px: 2.5,
            py: 1.5,
            "&.Mui-selected": {
              bgcolor: "action.selected",
              "&:hover": { bgcolor: "action.selected" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <ReceiptLongOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary="Заказы"
            secondary="Текущие и завершённые"
            primaryTypographyProps={{ fontWeight: selected === "orders" ? 700 : 600 }}
          />
        </ListItemButton>

        <ListItemButton
          component={Link}
          href={buildHref("requests")}
          selected={selected === "requests"}
          sx={{
            px: 2.5,
            py: 1.5,
            "&.Mui-selected": {
              bgcolor: "action.selected",
              "&:hover": { bgcolor: "action.selected" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <AssignmentTurnedInOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary="Заявки"
            secondary="Все ваши заявки"
            primaryTypographyProps={{ fontWeight: selected === "requests" ? 700 : 600 }}
          />
        </ListItemButton>

        <ListItemButton
          component={Link}
          href={buildHref("profile")}
          selected={selected === "profile"}
          sx={{
            px: 2.5,
            py: 1.5,
            "&.Mui-selected": {
              bgcolor: "action.selected",
              "&:hover": { bgcolor: "action.selected" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <PersonOutlineOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary="Данные"
            secondary="Аккаунт и контакты"
            primaryTypographyProps={{ fontWeight: selected === "profile" ? 700 : 600 }}
          />
        </ListItemButton>
      </List>
    </Paper>
  );
}

