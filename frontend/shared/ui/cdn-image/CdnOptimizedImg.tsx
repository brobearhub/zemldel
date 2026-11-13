"use client";

import { forwardRef, type ImgHTMLAttributes } from "react";
import Image from "next/image";
import { normalizePublicAssetSrc, storageFallbackSrc } from "@/shared/lib/public-asset-src";
import { useStorageImageSrc } from "./CdnImage";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "placeholder"> & {
  src?: string | null;
  ownerState?: unknown;
};

export const CdnOptimizedImg = forwardRef<HTMLImageElement, Props>(function CdnOptimizedImg(
  props,
  ref,
) {
  return <ImageContent key={props.src} {...props} forwardedRef={ref} />;
});

function ImageContent({
  src,
  alt = "",
  width = 40,
  height = 40,
  onError,
  ownerState: _ownerState,
  forwardedRef,
  ...props
}: Props & { forwardedRef: React.ForwardedRef<HTMLImageElement> }) {
  const image = useStorageImageSrc(src);
  if (!image.src) return null;
  const fallback = src ? storageFallbackSrc(normalizePublicAssetSrc(src)) : null;
  const optimized = process.env.NODE_ENV !== "development" && Boolean(
    image.src.startsWith("https://cdn.zemledel.ru/") ||
    (fallback && image.src === fallback),
  );
  const imageWidth = Number(width);
  const imageHeight = Number(height);

  return (
    <Image
      {...props}
      ref={forwardedRef}
      src={image.src}
      alt={alt}
      width={Number.isFinite(imageWidth) && imageWidth > 0 ? imageWidth : 40}
      height={Number.isFinite(imageHeight) && imageHeight > 0 ? imageHeight : 40}
      unoptimized={!optimized}
      onError={(event) => {
        if (!image.exhausted) image.onError();
        else onError?.(event);
      }}
    />
  );
}
