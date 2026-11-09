"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/hooks";

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const glow = glowRef.current;
    const ring = ringRef.current;
    if (reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let pointerX = -500;
    let pointerY = -500;
    let isInteractive = false;

    const updatePosition = () => {
      const transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
      if (glow) {
        glow.style.transform = transform;
      }
      if (ring) {
        ring.style.transform = transform;
        if (isInteractive) {
          ring.classList.add("cursor-ring-active");
        } else {
          ring.classList.remove("cursor-ring-active");
        }
      }
      frame = 0;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;

      const target = event.target as Element | null;
      isInteractive = Boolean(
        target?.closest(
          'button, a, input, select, textarea, [role="button"], [role="tab"], .interactive-hover, .hover-lift, [tabindex="0"]'
        )
      );

      if (!frame) frame = window.requestAnimationFrame(updatePosition);
    };

    const handlePointerLeave = () => {
      pointerX = -500;
      pointerY = -500;
      isInteractive = false;
      if (!frame) frame = window.requestAnimationFrame(updatePosition);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <>
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
