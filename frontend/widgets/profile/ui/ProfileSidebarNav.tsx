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
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";

export type ProfileNavSection = "profile" | "orders" | "requests" | "documents";

type Props = {
  selected: ProfileNavSection;
};

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
          href="/profile?section=requests"
          selected={selected === "requests" || selected === "orders"}
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
            primaryTypographyProps={{ fontWeight: selected === "requests" || selected === "orders" ? 700 : 600 }}
          />
        </ListItemButton>

        <ListItemButton
          component={Link}
          href="/profile?section=documents"
          selected={selected === "documents"}
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
            <DescriptionOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary="Документы"
            secondary="Личные документы"
            primaryTypographyProps={{ fontWeight: selected === "documents" ? 700 : 600 }}
          />
        </ListItemButton>

        <ListItemButton
          component={Link}
          href="/profile?section=profile"
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
            primary="Профиль"
            secondary="Личные данные"
            primaryTypographyProps={{ fontWeight: selected === "profile" ? 700 : 600 }}
          />
        </ListItemButton>
      </List>
    </Paper>
  );
}

