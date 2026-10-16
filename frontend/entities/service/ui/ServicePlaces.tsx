"use client";

import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { placeChipLabel, type ServicePlace } from "../lib/service-places";

const PREVIEW_COUNT = 3;

type Props = {
  places: readonly ServicePlace[];
};

export function ServicePlaces({ places }: Props) {
  const [expanded, setExpanded] = useState(false);
  const labels = places.map(placeChipLabel).filter((label) => label.length > 0);
  if (!labels.length) return null;

  const hidden = Math.max(0, labels.length - PREVIEW_COUNT);
  const visible = expanded || hidden === 0 ? labels : labels.slice(0, PREVIEW_COUNT);

  return (
    <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
      <Typography
        component="p"
        sx={{
          m: 0,
          fontSize: 12,
          fontWeight: 600,
          color: "text.secondary",
          overflowWrap: "anywhere",
        }}
      >
        {visible.join(", ")}
      </Typography>
      {hidden > 0 ? (
        <Button
          type="button"
          variant="text"
          size="small"
          aria-expanded={expanded}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((open) => !open);
          }}
          sx={{
            px: 0,
            minWidth: 0,
            minHeight: 32,
            color: "text.secondary",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {expanded ? "Свернуть" : `ещё ${hidden}`}
        </Button>
      ) : null}
    </Box>
  );
}
