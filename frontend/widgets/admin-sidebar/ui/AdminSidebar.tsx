"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BuildIcon from "@mui/icons-material/Build";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlined";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import { useMemo, useState } from "react";

const SERVICES_GROUP = {
  hrefPrefix: "/admin/services",
  label: "Услуги",
  icon: <BuildIcon />,
  items: [
    { href: "/admin/services/create", label: "Создать", icon: <AddCircleOutlineIcon /> },
    { href: "/admin/services/list", label: "Список", icon: <FormatListBulletedIcon /> },
  ],
} as const;

const CITIES_GROUP = {
  hrefPrefix: "/admin/cities",
  label: "Локации",
  icon: <LocationCityIcon />,
  items: [{ href: "/admin/cities/imports", label: "Импорты ГАР", icon: <FormatListBulletedIcon /> }],
} as const;

const CATEGORIES_GROUP = {
  hrefPrefix: "/admin/service-categories",
  label: "Категории",
  icon: <FolderOutlinedIcon />,
  items: [{ href: "/admin/service-categories/list", label: "Дерево", icon: <FormatListBulletedIcon /> }],
} as const;


export function AdminSidebar() {
  const pathname = usePathname();
  const isServicesRoute = useMemo(
    () => pathname === SERVICES_GROUP.hrefPrefix || pathname.startsWith(`${SERVICES_GROUP.hrefPrefix}/`),
    [pathname]
  );
  const isCategoriesRoute = useMemo(
    () =>
      pathname === CATEGORIES_GROUP.hrefPrefix || pathname.startsWith(`${CATEGORIES_GROUP.hrefPrefix}/`),
    [pathname]
  );
  const isCitiesRoute = useMemo(
    () => pathname === CITIES_GROUP.hrefPrefix || pathname.startsWith(`${CITIES_GROUP.hrefPrefix}/`),
    [pathname]
  );

  const [servicesOpen, setServicesOpen] = useState<boolean>(false);
  const [categoriesOpen, setCategoriesOpen] = useState<boolean>(false);
  const [citiesOpen, setCitiesOpen] = useState<boolean>(false);

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 1,
        overflow: "hidden",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.08em" }}>
          Admin
        </Typography>
      </Box>
      <Divider />
      <List dense disablePadding>
        <ListItemButton
          component={Link}
          href={CATEGORIES_GROUP.hrefPrefix}
          selected={isCategoriesRoute}
          sx={{
            px: 2,
            py: 1.25,
            "&.Mui-selected": {
              bgcolor: "action.selected",
              "&:hover": { bgcolor: "action.selected" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>{CATEGORIES_GROUP.icon}</ListItemIcon>
          <ListItemText
            primary={CATEGORIES_GROUP.label}
            slotProps={{
              primary: { sx: { fontWeight: isCategoriesRoute ? 800 : 700 } }
            }}
          />
          <IconButton
            size="small"
            aria-label={categoriesOpen ? "Свернуть" : "Раскрыть"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCategoriesOpen((v) => !v);
            }}
          >
            {categoriesOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </ListItemButton>

        <Collapse in={categoriesOpen} timeout="auto" unmountOnExit>
          <List dense disablePadding>
            {CATEGORIES_GROUP.items.map((item) => {
              const selected = pathname === item.href;
              return (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={selected}
                  sx={{
                    pl: 4,
                    pr: 2,
                    py: 1.1,
                    "&.Mui-selected": {
                      bgcolor: "action.selected",
                      "&:hover": { bgcolor: "action.selected" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: { sx: { fontWeight: selected ? 800 : 600 } }
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Collapse>

        <ListItemButton
          component={Link}
          href={CITIES_GROUP.hrefPrefix}
          selected={isCitiesRoute}
          sx={{
            px: 2,
            py: 1.25,
            "&.Mui-selected": {
              bgcolor: "action.selected",
              "&:hover": { bgcolor: "action.selected" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>{CITIES_GROUP.icon}</ListItemIcon>
          <ListItemText
            primary={CITIES_GROUP.label}
            slotProps={{
              primary: { sx: { fontWeight: isCitiesRoute ? 800 : 700 } }
            }}
          />
          <IconButton
            size="small"
            aria-label={citiesOpen ? "Свернуть" : "Раскрыть"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCitiesOpen((v) => !v);
            }}
          >
            {citiesOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </ListItemButton>

        <Collapse in={citiesOpen} timeout="auto" unmountOnExit>
          <List dense disablePadding>
            {CITIES_GROUP.items.map((item) => {
              const selected = pathname === item.href;
              return (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={selected}
                  sx={{
                    pl: 4,
                    pr: 2,
                    py: 1.1,
                    "&.Mui-selected": {
                      bgcolor: "action.selected",
                      "&:hover": { bgcolor: "action.selected" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: { sx: { fontWeight: selected ? 800 : 600 } }
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Collapse>

        <ListItemButton
          component={Link}
          href={SERVICES_GROUP.hrefPrefix}
          selected={isServicesRoute}
          sx={{
            px: 2,
            py: 1.25,
            "&.Mui-selected": {
              bgcolor: "action.selected",
              "&:hover": { bgcolor: "action.selected" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>{SERVICES_GROUP.icon}</ListItemIcon>
          <ListItemText
            primary={SERVICES_GROUP.label}
            slotProps={{
              primary: { sx: { fontWeight: isServicesRoute ? 800 : 700 } }
            }}
          />
          <IconButton
            size="small"
            aria-label={servicesOpen ? "Свернуть" : "Раскрыть"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setServicesOpen((v) => !v);
            }}
          >
            {servicesOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </ListItemButton>

        <Collapse in={servicesOpen} timeout="auto" unmountOnExit>
          <List dense disablePadding>
            {SERVICES_GROUP.items.map((item) => {
              const selected = pathname === item.href;
              return (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={selected}
                  sx={{
                    pl: 4,
                    pr: 2,
                    py: 1.1,
                    "&.Mui-selected": {
                      bgcolor: "action.selected",
                      "&:hover": { bgcolor: "action.selected" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: { sx: { fontWeight: selected ? 800 : 600 } }
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Collapse>
      </List>
    </Paper>
  );
}

