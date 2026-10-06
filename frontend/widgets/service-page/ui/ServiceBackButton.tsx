"use client";

import { useEffect, useState } from "react";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { Button } from "@mui/material";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { getPreviousInternalHref } from "@/shared/lib/internal-nav-history";

export function ServiceBackButton() {
  const router = useRouter();
  const [prevInternalHref, setPrevInternalHref] = useState<string | null>(null);

  useEffect(() => {
    setPrevInternalHref(getPreviousInternalHref());
  }, []);

  const href = prevInternalHref ?? "/";

  return (
    <Button
      component={NextLink}
      href={href}
      variant="text"
      size="small"
      startIcon={<ArrowBackIosNewIcon />}
      onClick={(e) => {
        if (prevInternalHref) {
          e.preventDefault();
          router.back();
        }
      }}
      sx={{
        alignSelf: "flex-start",
        textTransform: "none",
        fontWeight: 500,
        color: "text.secondary",
      }}
    >
      Назад
    </Button>
  );
}
