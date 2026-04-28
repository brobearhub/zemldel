"use client";

import Image from "next/image";
import { Box, Container, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useCallback, useEffect, useState } from "react";

export const Hero = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), {
    noSsr: true,
  });
  const isLight = theme.palette.mode === "light";
  const posterSrc = isLight ? "/hero-bg-house_static_day.jpg" : "/hero-bg-house_static.jpg";
  const GRID_SIZE = 122;

  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const [hoverCell, setHoverCell] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // Устанавливаем флаг монтирования и определяем правильный источник видео
  useEffect(() => {
    setIsMounted(true);
    
    // Определяем нужное видео только на клиенте
    const src = isLight
      ? "/hero-bg_video_house_day_convert.mp4"
      : isMobile
        ? "/hero-bg_video_house_vertical.mp4"
        : "/hero-bg_video_house.mp4";
    
    setVideoSrc(src);
  }, [isLight, isMobile]);

  // Загружаем видео после монтирования
  useEffect(() => {
    if (!isMounted || !videoSrc) return;

    // Если десктоп - загружаем видео сразу
    if (!isMobile) {
      setShouldLoadVideo(true);
      return;
    }

    // Если мобайл - ждем полной загрузки страницы
    const loadVideo = () => {
      if (document.readyState === "complete") {
        setTimeout(() => {
          setShouldLoadVideo(true);
        }, 100);
      }
    };

    if (document.readyState === "complete") {
      loadVideo();
    } else {
      window.addEventListener("load", loadVideo);
      return () => window.removeEventListener("load", loadVideo);
    }
  }, [isMobile, isMounted, videoSrc]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const snappedX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.floor(y / GRID_SIZE) * GRID_SIZE;

      setHoverCell((prev) => {
        if (prev.visible && prev.x === snappedX && prev.y === snappedY) return prev;
        return { x: snappedX, y: snappedY, visible: true };
      });
    },
    [GRID_SIZE],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverCell((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  return (
    <Box
      component="section"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: "relative",
        minHeight: "100vh",
        "@supports (height: 100dvh)": {
          minHeight: "100dvh",
        },
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        bgcolor: "common.black",
      }}
    >
      {/* Background image as fallback if video doesn't load */}
      <Image
        src={posterSrc}
        alt="Земледел"
        fill
        priority
        style={{
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
        }}
      />

      {shouldLoadVideo && videoSrc ? (
        <Box
          component="video"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={posterSrc}
          src={videoSrc}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            minWidth: "100%",
            minHeight: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
            // Reduce 1px seams from GPU/subpixel rounding without changing crop
            transform: "translateZ(0)",
            willChange: "transform",
            backfaceVisibility: "hidden",
            bgcolor: "common.black",
            zIndex: 1,
          }}
        />
      ) : null}

      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          backgroundImage:
            "radial-gradient(1200px 700px at 60% 40%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.75) 100%)",
          opacity: 0.6,
          mixBlendMode: "luminosity",
          pointerEvents: "none",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            // Thin grid overlay (чётче на светлой теме)
            backgroundImage: theme.palette.mode === "light"
              ? `
                linear-gradient(rgba(0,0,0,0.22) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.22) 1px, transparent 1px)
              `
              : `
                linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)
              `,
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            backgroundRepeat: "repeat",
            mixBlendMode: theme.palette.mode === "light" ? "normal" : "soft-light",
            opacity: 1,
          },
        }}
      />

      <Box
        aria-hidden
        sx={{
          position: "absolute",
          zIndex: 2.5,
          width: GRID_SIZE,
          height: GRID_SIZE,
          left: hoverCell.x,
          top: hoverCell.y,
          opacity: hoverCell.visible ? 1 : 0,
          transition: "opacity 120ms ease",
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(255,255,255,0.10), rgba(255,255,255,0.10))",
          mixBlendMode: "screen",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
        }}
      />

      <Container sx={{ position: "relative", zIndex: 3 }}>
        <Stack spacing={{ xs: 2.5, md: 3 }} alignItems="center" textAlign="center">
          <Typography
            component="h1"
            sx={{
              color: "common.white",
              fontWeight: 900,
              lineHeight: 0.86,
              letterSpacing: "-0.03em",
              textTransform: "none",
              fontSize: { xs: 60, sm: 104, md: 140 },
              textWrap: "balance",
              mx: "auto",
              position: "relative",
            }}
          >
            <Box 
             position="absolute"
             left={{ xs: "17.5px", sm: "30.4px", md: "41px" }}
             top={{ xs: "-42px", sm: "-73px", md: "-98px" }}
             component="span" 
             sx={{ display: "block" }}>
              Земледел
            </Box>
          </Typography>

          <Box
            aria-hidden
            sx={{
              width: { xs: "92%", sm: 740, md: 860 },
              maxWidth: "100%",
              height: 2,
              bgcolor: "primary.main",
              borderRadius: 999,
              opacity: 0.95,
            }}
          />

          <Typography
            sx={{
              color: "rgba(255,255,255,0.9)",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontSize: { xs: 12, sm: 13, md: 14 },
            }}
          >
            Ваш путь к идеальному участку
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

