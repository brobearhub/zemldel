"use client";

import { useState } from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { CdnFillImage } from "@/shared/ui/cdn-image";

export function ServiceImageGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(0, images.length - 1));
  if (!images.length) return null;

  return (
    <>
      <CdnFillImage
        src={images[index]}
        alt={`${title} — фото ${index + 1}`}
        sizes="(max-width: 900px) 100vw, 600px"
        unoptimized={process.env.NODE_ENV !== "production"}
        style={{
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      {images.length > 1 ? (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            position: "absolute",
            bottom: 12,
            right: 12,
            alignItems: "center",
            bgcolor: "background.paper",
            borderRadius: 5,
          }}
        >
          <IconButton
            aria-label="Предыдущее фото услуги"
            onClick={() => setSelected((index + images.length - 1) % images.length)}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Box aria-live="polite">
            <Typography variant="body2">{index + 1} / {images.length}</Typography>
          </Box>
          <IconButton
            aria-label="Следующее фото услуги"
            onClick={() => setSelected((index + 1) % images.length)}
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      ) : null}
    </>
  );
}
