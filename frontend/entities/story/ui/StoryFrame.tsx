import { useEffect, useRef, type ReactNode } from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { CdnFillImage } from "@/shared/ui/cdn-image";

type Props = {
  imageUrl: string | null;
  videoUrl?: string | null;
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
export function StoryFrame({
  imageUrl,
  videoUrl,
  imageAlt = "",
  onImageLoad,
  onImageError,
  children,
  sx,
}: Props) {
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
      {videoUrl ? (
        <StoryVideo
          key={videoUrl}
          src={videoUrl}
          poster={imageUrl ?? undefined}
          onReady={onImageLoad}
          onError={onImageError}
        />
      ) : imageUrl ? (
        <CdnFillImage
          key={imageUrl}
          src={imageUrl}
          alt={imageAlt}
          sizes="(min-width: 900px) 500px, 100vw"
          unoptimized={process.env.NODE_ENV !== "production" ||
            (!imageUrl.startsWith("https://cdn.zemledel.ru/") && !imageUrl.startsWith("/"))}
          onLoad={notifyLoaded}
          onError={notifyError}
          ref={(node) => {
            // Уже закэшированное фото не шлёт load повторно, если src успел выставиться до подписки.
            if (node?.complete && node.naturalWidth > 0) notifyLoaded();
          }}
          style={{
            objectFit: "cover",
          }}
        />
      ) : null}
      {children}
    </Box>
  );
}

function StoryVideo({
  src,
  poster,
  onReady,
  onError,
}: {
  src: string;
  poster?: string;
  onReady?: () => void;
  onError?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const pause = () => {
      if (document.hidden) video.pause();
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (entry.intersectionRatio < 0.6) video.pause();
            },
            { threshold: [0, 0.6, 1] },
          );
    observer?.observe(video);
    document.addEventListener("visibilitychange", pause);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", pause);
      video.pause();
    };
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      controls
      playsInline
      preload="metadata"
      aria-label="Видео истории"
      onLoadedMetadata={onReady}
      onError={onError}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  );
}
