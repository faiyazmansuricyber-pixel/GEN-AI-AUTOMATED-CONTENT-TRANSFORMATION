"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/hooks";

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = glowRef.current;
    if (!element || reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let pointerX = -500;
    let pointerY = -500;
    const updatePosition = () => {
      element.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
      frame = 0;
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(updatePosition);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return <div ref={glowRef} className="cursor-glow" aria-hidden="true" />;
}
