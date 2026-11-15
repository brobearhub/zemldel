"use client";

import { useId, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, IconButton, Popover, Typography } from "@mui/material";
import type { PlanComparisonFeature } from "./model";

export function PlanFeatureLabel({
  feature,
}: {
  feature: PlanComparisonFeature;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const id = useId();
  const open = Boolean(anchorEl);
  const close = () => setAnchorEl(null);

  if (!feature.details) return <>{feature.label}</>;

  return (
    <>
      {feature.label}{" "}
      <IconButton
        size="small"
        color="inherit"
        aria-label={`Подробнее: ${feature.label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          verticalAlign: "middle",
          minWidth: 32,
          minHeight: 32,
        }}
      >
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            id,
            role: "dialog",
            "aria-labelledby": `${id}-title`,
            "aria-describedby": `${id}-description`,
            sx: {
              width: 440,
              maxWidth: "calc(100vw - 32px)",
              p: 2,
            },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            mb: 1.5,
          }}
        >
          <Typography
            id={`${id}-title`}
            component="h3"
            variant="subtitle1"
            sx={{
              flex: 1,
              fontWeight: 700,
            }}
          >
            {feature.label}
          </Typography>
          <IconButton
            size="small"
            aria-label="Закрыть пояснение"
            onClick={close}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box
          id={`${id}-description`}
          sx={{
            display: "grid",
            gap: 1.5,
          }}
        >
          {feature.details.map((paragraph) => (
            <Typography
              key={paragraph}
              variant="body2"
            >
              {paragraph}
            </Typography>
          ))}
        </Box>
      </Popover>
    </>
  );
}
