"use client";

import { useEffect } from "react";

/** VisualViewport also follows the mobile keyboard when 100dvh does not shrink. */
export function useChatViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const update = () => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      root.style.setProperty(
        "--chat-viewport-height",
        mobile && viewport ? `${viewport.height}px` : "100dvh",
      );
      root.style.setProperty(
        "--chat-viewport-top",
        mobile && viewport ? `${viewport.offsetTop}px` : "0px",
      );
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      root.style.removeProperty("--chat-viewport-height");
      root.style.removeProperty("--chat-viewport-top");
    };
  }, []);
}
