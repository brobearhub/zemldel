"use client";

import { useId, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { Dialog, DialogTitle, IconButton } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ZoomInOutlined from "@mui/icons-material/ZoomInOutlined";
import ZoomOutOutlined from "@mui/icons-material/ZoomOutOutlined";
import styles from "./guide.module.css";

type Props = {
  source: StaticImageData;
  alt: string;
  caption: string;
  priority?: boolean;
};

export function GuideScreenshot({ source, alt, caption, priority }: Props) {
  const titleId = useId();
  const [view, setView] = useState<"fit" | "original" | null>(null);
  const originalSize = view === "original";
  const zoomLabel = originalSize ? "Уместить снимок целиком" : "Показать в исходном размере";
  const close = () => setView(null);

  return (
    <figure className={styles.figure}>
      <button
        type="button"
        className={styles.screenshotButton}
        aria-label={`Увеличить снимок. ${caption}`}
        aria-haspopup="dialog"
        onClick={() => setView("fit")}
      >
        <Image src={source} alt={alt} sizes="(max-width: 800px) 92vw, 550px" priority={priority} />
        <span className={styles.zoom} aria-hidden="true"><ZoomInOutlined fontSize="small" /></span>
      </button>
      <figcaption>{caption}</figcaption>

      <Dialog
        open={view !== null}
        onClose={close}
        aria-labelledby={titleId}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              m: { xs: 1, sm: 3 },
              width: { xs: "calc(100% - 16px)", sm: "calc(100% - 48px)" },
              maxWidth: 1200,
              maxHeight: { xs: "calc(100dvh - 16px)", sm: "calc(100dvh - 48px)" },
              overflow: "hidden",
            },
          },
        }}
      >
        <div className={styles.viewerToolbar}>
          <DialogTitle id={titleId} sx={{ flex: 1, p: 0, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            {caption}
          </DialogTitle>
          <IconButton
            aria-label={zoomLabel}
            title={zoomLabel}
            onClick={() => setView(originalSize ? "fit" : "original")}
          >
            {originalSize ? <ZoomOutOutlined /> : <ZoomInOutlined />}
          </IconButton>
          <IconButton aria-label="Закрыть снимок" title="Закрыть" onClick={close}>
            <CloseRounded />
          </IconButton>
        </div>
        <div
          className={styles.viewerCanvas}
          role="region"
          aria-label={caption}
          tabIndex={originalSize ? 0 : undefined}
        >
          <Image
            src={source}
            alt={alt}
            unoptimized
            loading="eager"
            className={styles.viewerImage}
            data-original={originalSize || undefined}
          />
        </div>
      </Dialog>
    </figure>
  );
}
