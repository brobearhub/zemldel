import type { SxProps, Theme } from "@mui/material/styles";

export const panelSx: SxProps<Theme> = {
  border: 1,
  borderColor: "divider",
  borderRadius: "10px",
  bgcolor: "background.paper",
  boxShadow: "none",
};

export const actionSx: SxProps<Theme> = {
  bgcolor: "text.primary",
  color: "background.paper",
  "&:hover": {
    bgcolor: "text.primary",
    opacity: 0.9,
  },
};

export const selectedSx: SxProps<Theme> = {
  textTransform: "none",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: "6px !important",
  border: "0 !important",
  px: 2,
  py: 0.5,
  minHeight: 32,
  "&.Mui-selected, &.Mui-selected:hover": {
    bgcolor: "text.primary",
    color: "background.paper",
  },
};
