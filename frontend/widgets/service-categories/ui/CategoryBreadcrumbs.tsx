"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Box,
  Breadcrumbs,
  ButtonBase,
  ClickAwayListener,
  Divider,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Typography,
} from "@mui/material";

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

type CrumbMenuProps = {
  label: string;
  href: string;
  items: Category[];
  currentId: string;
  isCurrent?: boolean;
};

function CrumbMenu({
  label,
  href,
  items,
  currentId,
  isCurrent,
}: CrumbMenuProps) {
  const id = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [focusMenu, setFocusMenu] = useState(false);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const close = (restoreFocus = false) => {
    cancelClose();
    setOpen(false);
    if (restoreFocus) anchorRef.current?.focus();
  };

  const openOnHover = () => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    cancelClose();
    setFocusMenu(false);
    setOpen(true);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      close(true);
    }
  };

  return (
    <ClickAwayListener onClickAway={() => close()}>
      <Box component="span" sx={{ display: "inline-flex" }}>
        <ButtonBase
          ref={anchorRef}
          id={`${id}-trigger`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? `${id}-menu` : undefined}
          aria-current={isCurrent ? "page" : undefined}
          onMouseEnter={openOnHover}
          onMouseLeave={scheduleClose}
          onClick={() => {
            cancelClose();
            setFocusMenu(true);
            setOpen((value) => !value);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              cancelClose();
              setFocusMenu(true);
              setOpen(true);
            }
          }}
          sx={{
            gap: 0.25,
            borderRadius: 0.5,
            color: "text.secondary",
            font: "inherit",
            textAlign: "left",
            "&:hover, &[aria-expanded='true']": {
              color: "text.primary",
            },
            "&.Mui-focusVisible": {
              outline: "2px solid currentColor",
              outlineOffset: 4,
            },
          }}
        >
          {label}
          <ExpandMoreRoundedIcon
            sx={{
              fontSize: 17,
              flexShrink: 0,
              transform: open ? "rotate(180deg)" : "none",
            }}
          />
        </ButtonBase>
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          modifiers={[
            { name: "offset", options: { offset: [0, 8] } },
            { name: "preventOverflow", options: { padding: 16 } },
          ]}
          sx={{ zIndex: (theme) => theme.zIndex.modal }}
        >
          <Paper
            elevation={8}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            sx={{
              width: 360,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "min(480px, 65dvh)",
              overflowY: "auto",
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <MenuList
              id={`${id}-menu`}
              aria-labelledby={`${id}-trigger`}
              autoFocusItem={focusMenu}
              onKeyDown={handleMenuKeyDown}
              sx={{
                p: 0.75,
                "& .MuiMenuItem-root": {
                  whiteSpace: "normal",
                  minHeight: 44,
                  borderRadius: 0.75,
                  px: 1.5,
                  py: 1,
                  fontSize: "1rem",
                  lineHeight: 1.5,
                },
              }}
            >
              <MenuItem
                component={Link}
                href={href}
                onClick={() => close()}
                sx={{ fontWeight: 700 }}
              >
                {href === "/" ? "На главную" : "Открыть раздел"}
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              {items.map((item) => (
                <MenuItem
                  key={item.id}
                  component={Link}
                  href={`/service-categories/${encodeURIComponent(item.slug)}`}
                  selected={item.id === currentId}
                  aria-current={item.id === currentId ? "page" : undefined}
                  onClick={() => close()}
                >
                  {item.name}
                </MenuItem>
              ))}
            </MenuList>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

export function CategoryBreadcrumbs({
  categoryId,
  categories,
}: {
  categoryId: string;
  categories: Category[];
}) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return null;
  const parent = categories.find((item) => item.id === category.parentId);
  const childrenOf = (parentId: string | null) =>
    categories
      .filter((item) => item.parentId === parentId)
      .sort(
        (a, b) =>
          (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) ||
          a.name.localeCompare(b.name, "ru"),
      );
  const children = childrenOf(category.id);

  return (
    <Breadcrumbs aria-label="Навигация по категориям" sx={{ fontSize: "1rem" }}>
      <CrumbMenu
        label="Главная"
        href="/"
        items={childrenOf(null)}
        currentId={categoryId}
      />
      {parent ? (
        <CrumbMenu
          label={parent.name}
          href={`/service-categories/${encodeURIComponent(parent.slug)}`}
          items={childrenOf(parent.id)}
          currentId={categoryId}
        />
      ) : null}
      {children.length ? (
        <CrumbMenu
          label={category.name}
          href={`/service-categories/${encodeURIComponent(category.slug)}`}
          items={children}
          currentId={categoryId}
          isCurrent
        />
      ) : (
        <Typography
          aria-current="page"
          sx={{
            fontSize: "inherit",
            color: "text.secondary",
          }}
        >
          {category.name}
        </Typography>
      )}
    </Breadcrumbs>
  );
}
