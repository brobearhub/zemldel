"use client";

import { forwardRef, useState } from "react";
import { Avatar, type AvatarProps } from "@mui/material";
import Image from "next/image";
import { normalizePublicAssetSrc, storageFallbackSrc } from "@/shared/lib/public-asset-src";
import { useStorageImageSrc } from "./CdnImage";

type Props = Omit<AvatarProps, "src" | "srcSet" | "sizes"> & {
  src?: string | null;
  sizes: string;
};

export const CdnOptimizedAvatar = forwardRef<HTMLDivElement, Props>(function CdnOptimizedAvatar(
  props,
  ref,
) {
  return <AvatarContent key={props.src} {...props} forwardedRef={ref} />;
});

function AvatarContent({
  src,
  sizes,
  children,
  alt = "",
  forwardedRef,
  ...props
}: Props & { forwardedRef: React.ForwardedRef<HTMLDivElement> }) {
  const image = useStorageImageSrc(src);
  const [failed, setFailed] = useState(false);
  const fallback = src ? storageFallbackSrc(normalizePublicAssetSrc(src)) : null;
  const optimized = process.env.NODE_ENV !== "development" && Boolean(
    image.src?.startsWith("https://cdn.zemledel.ru/") ||
    (fallback && image.src === fallback),
  );

  return (
    <Avatar ref={forwardedRef} {...props}>
      {image.src && !failed ? (
        <Image
          className="MuiAvatar-img"
          src={image.src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized={!optimized}
          style={{ objectFit: "cover" }}
          onError={() => {
            if (!image.exhausted) image.onError();
            else setFailed(true);
          }}
        />
      ) : children}
    </Avatar>
  );
}
