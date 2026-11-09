"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return reducedMotion;
}

export function useInView<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): { ref: React.RefObject<T | null>; inView: boolean } {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export function useMouseSpotlight<T extends HTMLElement = HTMLDivElement>(): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const updatePosition = () => {
      const bounds = element.getBoundingClientRect();
      element.style.setProperty("--mx", `${pointerX - bounds.left}px`);
      element.style.setProperty("--my", `${pointerY - bounds.top}px`);
      frame = 0;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(updatePosition);
    };

    const clearPosition = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      element.style.removeProperty("--mx");
      element.style.removeProperty("--my");
    };

    element.addEventListener("pointermove", handlePointerMove, { passive: true });
    element.addEventListener("pointerleave", clearPosition);
    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", clearPosition);
      clearPosition();
    };
  }, [reducedMotion]);

  return ref;
}

export function useTilt<T extends HTMLElement = HTMLDivElement>(
  maxAngle = 12,
): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const resetTilt = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      element.style.setProperty("--tilt-x", "0deg");
      element.style.setProperty("--tilt-y", "0deg");
      element.style.setProperty("--shadow-x", "0px");
      element.style.setProperty("--shadow-y", "8px");
    };

    const updateTilt = () => {
      const bounds = element.getBoundingClientRect();
      const x = (pointerX - bounds.left) / bounds.width;
      const y = (pointerY - bounds.top) / bounds.height;
      element.style.setProperty("--tilt-x", `${(0.5 - y) * maxAngle}deg`);
      element.style.setProperty("--tilt-y", `${(x - 0.5) * maxAngle}deg`);
      element.style.setProperty("--shadow-x", `${(x - 0.5) * -14}px`);
      element.style.setProperty("--shadow-y", `${8 + y * 12}px`);
      frame = 0;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(updateTilt);
    };

    element.addEventListener("pointermove", handlePointerMove, { passive: true });
    element.addEventListener("pointerleave", resetTilt);
    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", resetTilt);
      resetTilt();
    };
  }, [maxAngle, reducedMotion]);

  return ref;
}

export function useCountUp(target: number, duration = 900): {
  ref: React.RefObject<HTMLDivElement | null>;
  value: number;
} {
  const { ref, inView } = useInView<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      setValue(target);
      return;
    }
    if (!inView) return;

    let frame = 0;
    const startedAt = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * easedProgress));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    setValue(0);
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, inView, reducedMotion, target]);

  return { ref, value };
}

export function useMagnetic<T extends HTMLButtonElement = HTMLButtonElement>(): {
  ref: React.RefObject<T | null>;
  ripple: { id: number; x: number; y: number } | null;
  onPointerDown: (event: ReactPointerEvent<T>) => void;
} {
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();
  const [ripple, setRipple] = useState<{ id: number; x: number; y: number } | null>(null);
  const rippleId = useRef(0);
  const rippleTimeout = useRef<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const updatePosition = () => {
      const bounds = element.getBoundingClientRect();
      const x = (pointerX - bounds.left) / bounds.width - 0.5;
      const y = (pointerY - bounds.top) / bounds.height - 0.5;
      element.style.setProperty("--magnetic-x", `${x * 20}px`);
      element.style.setProperty("--magnetic-y", `${y * 20}px`);
      frame = 0;
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(updatePosition);
    };
    const resetPosition = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      element.style.setProperty("--magnetic-x", "0px");
      element.style.setProperty("--magnetic-y", "0px");
    };

    element.addEventListener("pointermove", handlePointerMove, { passive: true });
    element.addEventListener("pointerleave", resetPosition);
    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", resetPosition);
      resetPosition();
    };
  }, [reducedMotion]);

  useEffect(() => () => {
    if (rippleTimeout.current !== null) window.clearTimeout(rippleTimeout.current);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<T>) => {
    if (reducedMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const id = ++rippleId.current;
    setRipple({ id, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    if (rippleTimeout.current !== null) window.clearTimeout(rippleTimeout.current);
    rippleTimeout.current = window.setTimeout(() => setRipple(null), 550);
  };

  return { ref, ripple, onPointerDown };
}
