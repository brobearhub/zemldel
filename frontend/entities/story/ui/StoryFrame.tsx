import { useRef, type ReactNode } from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { toPublicAssetSrc } from "@/shared/lib/public-asset-src";

type Props = {
  imageUrl: string | null;
  imageAlt?: string;
  onImageLoad?: () => void;
  onImageError?: () => void;
  children?: ReactNode;
  sx?: SxProps<Theme>;
};

/**
 * Кадр сторис: фото на всю область.
 * Один и тот же кадр у превью в кабинете и у полноэкранного просмотра, чтобы обложка не жила в двух местах.
 */
export function StoryFrame({ imageUrl, imageAlt = "", onImageLoad, onImageError, children, sx }: Props) {
  const onImageLoadRef = useRef(onImageLoad);
  const onImageErrorRef = useRef(onImageError);
  const notifiedSrc = useRef<string | null>(null);
  onImageLoadRef.current = onImageLoad;
  onImageErrorRef.current = onImageError;

  function notifyLoaded() {
    if (!imageUrl || notifiedSrc.current === imageUrl) return;
    notifiedSrc.current = imageUrl;
    onImageLoadRef.current?.();
  }

  function notifyError() {
    if (!imageUrl || notifiedSrc.current === imageUrl) return;
    notifiedSrc.current = imageUrl;
    onImageErrorRef.current?.();
  }

  return (
    <Box
      sx={[
        {
          position: "relative",
          overflow: "hidden",
          bgcolor: "grey.900",
          color: "common.white",
        },
        ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={toPublicAssetSrc(imageUrl)}
          alt={imageAlt}
          onLoad={notifyLoaded}
          onError={notifyError}
          ref={(node: HTMLImageElement | null) => {
            // Уже закэшированное фото не шлёт load повторно, если src успел выставиться до подписки.
            if (node?.complete && node.naturalWidth > 0) notifyLoaded();
          }}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
      {children}
    </Box>
  );
}
