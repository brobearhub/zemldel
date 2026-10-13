"use client";

import LinkIcon from "@mui/icons-material/Link";
import { Link, Tooltip } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { cadastralNspdMapUrl } from "@/entities/request/lib/cadastral-number";

type Props = {
  value: string;
  sx?: SxProps<Theme>;
};

/**
 * Номер и иконка слева открывают карту НСПД.
 * Подчёркивания нет: ссылку показывает иконка, а тултип — текст «перейти на сайт».
 */
export function CadastralNumberMapLink({ value, sx }: Props) {
  const href = cadastralNspdMapUrl(value);

  return (
    <Tooltip
      describeChild
      placement="top"
      leaveDelay={400}
      slotProps={{
        popper: {
          sx: { zIndex: 2000 },
        },
      }}
      title={
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: "inherit", fontSize: 13, textDecoration: "underline" }}
        >
          перейти на сайт
        </Link>
      }
    >
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={[
          {
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            color: "inherit",
            font: "inherit",
            width: "fit-content",
            textDecoration: "none",
            "&:hover": { textDecoration: "none" },
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        <LinkIcon aria-hidden sx={{ fontSize: 16, flexShrink: 0 }} />
        {value}
      </Link>
    </Tooltip>
  );
}
