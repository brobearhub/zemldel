"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import NextLink from "next/link";
import { Box, ClickAwayListener, Link, Tooltip } from "@mui/material";

export const LITE_AND_BUSINESS = "Доступно на тарифах Лайт и Бизнес.";
export const BUSINESS_ONLY = "Доступно на тарифе Бизнес.";

/** Keep the feature visible, intercept interaction, and explain how to unlock it. */
export function PlanFeatureGate({
  message,
  label,
  children,
  fullWidth = false,
  grow = false,
}: {
  message: string | null;
  label: string;
  children: ReactNode;
  fullWidth?: boolean;
  grow?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  if (!message) return <>{children}</>;
  return (
    <ClickAwayListener
      mouseEvent="onMouseDown"
      touchEvent="onTouchStart"
      onClickAway={() => setOpen(false)}
    >
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          width: fullWidth ? "100%" : undefined,
          flex: grow ? 1 : undefined,
          minWidth: 0,
        }}
      >
        <Tooltip
          arrow
          open={open}
          onClose={() => setOpen(false)}
          disableHoverListener
          disableFocusListener
          disableTouchListener
          title={
            <Box
              ref={popupRef}
              onMouseEnter={() => clearTimeout(closeTimer.current)}
              onMouseLeave={hideSoon}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setOpen(false);
              }}
              sx={{ p: 0.5 }}
            >
              {message}
              <Link
                component={NextLink}
                href="/pro/settings/tariff"
                color="inherit"
                underline="always"
                sx={{ display: "block", mt: 0.5 }}
              >
                Перейти к тарифам
              </Link>
            </Box>
          }
        >
          <Box
            component="span"
            role="button"
            tabIndex={0}
            aria-label={label}
            onMouseEnter={show}
            onMouseLeave={hideSoon}
            onFocus={show}
            onBlur={(event) => {
              if (!popupRef.current?.contains(event.relatedTarget))
                setOpen(false);
            }}
            onClickCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                setOpen(true);
              }
            }}
            sx={{
              display: "inline-flex",
              width: "100%",
              cursor: "pointer",
              borderRadius: 1,
            }}
          >
            <Box
              component="span"
              aria-hidden
              ref={(node: HTMLSpanElement | null) => {
                if (node) node.inert = true;
              }}
              sx={{
                display: "inline-flex",
                width: "100%",
                pointerEvents: "none",
              }}
            >
              {children}
            </Box>
          </Box>
        </Tooltip>
      </Box>
    </ClickAwayListener>
  );
}
