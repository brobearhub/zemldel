import { ListItem } from "@mui/material";

type Props = {
  isLast?: boolean;
};

export function ServiceRequestRowPlaceholder({ isLast }: Props) {
  return (
    <ListItem
      disablePadding
      sx={{
        px: 2,
        py: 1.25,
        minHeight: 86,
        borderBottom: isLast ? "none" : "1px solid",
        borderBottomColor: "divider",
        bgcolor: "transparent",
      }}
    />
  );
}

