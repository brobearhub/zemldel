"use client";

import { forwardRef, useEffect, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { Avatar, Box, type AvatarProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import Image, { type ImageProps } from "next/image";
import { storageFallbackSrc } from "@/shared/lib/public-asset-src";

type ImageSource = string | null | undefined;

/**
 * Сначала исходный адрес. Один раз при ошибке — тот же ключ в Object Storage.
 * Why: повторный onError уже на S3 не должен зацикливать загрузку.
 */
export function useStorageImageSrc(src: ImageSource) {
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setUseFallback(false);
  }, [src]);

  const fallback = src ? storageFallbackSrc(src) : null;
  const current = useFallback && fallback ? fallback : (src ?? undefined);

  function onError() {
    if (fallback && !useFallback) setUseFallback(true);
  }

  return { src: current, onError, exhausted: useFallback || !fallback };
}

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: ImageSource;
  /** MUI-слот чата прокидывает ownerState, на <img> его быть не должно. */
  ownerState?: unknown;
};

export const CdnImg = forwardRef<HTMLImageElement, ImgProps>(function CdnImg(
  { src, onError, onLoad, alt = "", ownerState: _ownerState, ...rest },
  ref,
) {
  const image = useStorageImageSrc(src);

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    if (!image.exhausted) {
      image.onError();
      return;
    }
    onError?.(event);
  }

  return (
    <img
      {...rest}
      ref={ref}
      src={image.src}
      alt={alt}
      onLoad={onLoad}
      onError={handleError}
    />
  );
});

type CdnImageProps = ImgProps & {
  sx?: SxProps<Theme>;
};

export const CdnImage = forwardRef<HTMLImageElement, CdnImageProps>(function CdnImage({ sx, ...props }, ref) {
  return <Box component={CdnImg} ref={ref} sx={sx} {...props} />;
});

type FillImageProps = {
  src: string;
  alt?: string;
  sizes: string;
  style?: ImageProps["style"];
  unoptimized?: boolean;
};

/** next/image на всю область: при ошибке CDN src становится адресом Storage. */
export function CdnFillImage({ src, alt = "", sizes, style, unoptimized }: FillImageProps) {
  const image = useStorageImageSrc(src);
  if (!image.src) return null;
  return (
    <Image
      src={image.src}
      alt={alt}
      fill
      unoptimized={unoptimized}
      sizes={sizes}
      style={style}
      onError={() => image.onError()}
    />
  );
}

export const CdnAvatar = forwardRef<HTMLDivElement, AvatarProps>(function CdnAvatar({ src, slotProps, ...rest }, ref) {
  const image = useStorageImageSrc(typeof src === "string" ? src : undefined);
  const imgSlot = slotProps?.img;
  const imgProps = typeof imgSlot === "function" ? undefined : imgSlot;

  return (
    <Avatar
      ref={ref}
      {...rest}
      src={image.src}
      slotProps={{
        ...slotProps,
        img: {
          ...imgProps,
          onError: (event) => {
            if (!image.exhausted) {
              image.onError();
              return;
            }
            imgProps?.onError?.(event);
          },
        },
      }}
    />
  );
});
