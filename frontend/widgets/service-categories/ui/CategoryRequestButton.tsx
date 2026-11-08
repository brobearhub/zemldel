"use client";

import { useId, useState, type ComponentProps } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { PublicUnlinkedRequestForm } from "@/widgets/public-service/ui/PublicUnlinkedRequestForm";
import styles from "./category-guide.module.css";

type Props = Pick<
  ComponentProps<typeof PublicUnlinkedRequestForm>,
  "isAuthenticated" | "categories" | "initialCategory" | "sectionCategory"
> & { size?: "small" | "medium" };

export function CategoryRequestButton({ size = "medium", ...props }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <>
      <button
        type="button"
        className={
          size === "small"
            ? `${styles.action} ${styles.actionSmall}`
            : styles.action
        }
        aria-haspopup="dialog"
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(true)}
      >
        Обсудить задачу
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
        aria-labelledby={`${id}-title`}
        slotProps={{
          paper: {
            id,
            sx: {
              maxWidth: fullScreen ? "none" : 560,
              borderRadius: fullScreen ? 0 : 2,
            },
          },
        }}
      >
        <DialogTitle
          id={`${id}-title`}
          sx={{
            fontWeight: 700,
            fontSize: "1.375rem",
            pl: { xs: 2.5, sm: 3 },
            pr: 8,
            pt: "calc(24px + env(safe-area-inset-top))",
            pb: 2,
          }}
        >
          Опишите задачу
        </DialogTitle>
        <IconButton
          aria-label="Закрыть форму"
          onClick={() => setOpen(false)}
          sx={{
            position: "absolute",
            top: "calc(16px + env(safe-area-inset-top))",
            right: 12,
            color: "text.primary",
          }}
        >
          <CloseRoundedIcon />
        </IconButton>
        <DialogContent
          sx={{
            px: { xs: 2.5, sm: 3 },
            pt: 0,
            pb: "calc(24px + env(safe-area-inset-bottom))",
          }}
        >
          <PublicUnlinkedRequestForm {...props} variant="bare" />
        </DialogContent>
      </Dialog>
    </>
  );
}
