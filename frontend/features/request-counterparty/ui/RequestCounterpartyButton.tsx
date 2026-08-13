"use client";

import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import { Button } from "@mui/material";

type Props = {
  visible: boolean;
  label: string;
  onClick: () => void;
};

export function RequestCounterpartyButton({ visible, label, onClick }: Props) {
  if (!visible) return null;

  return (
    <Button
      variant="text"
      color="inherit"
      size="small"
      endIcon={<AssignmentIndIcon />}
      onClick={onClick}
      sx={{
        fontWeight: 700,
        flexShrink: 0,
        minWidth: 0,
        px: 0,
        py: 0,
        lineHeight: 1.43,
      }}
    >
      {label}
    </Button>
  );
}
