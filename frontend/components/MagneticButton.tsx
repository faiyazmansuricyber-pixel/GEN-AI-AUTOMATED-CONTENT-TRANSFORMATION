"use client";

import React from "react";
import { useMagnetic } from "@/lib/hooks";

type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function MagneticButton({
  children,
  className = "",
  onPointerDown,
  type = "button",
  ...props
}: MagneticButtonProps) {
  const { ref, ripple, onPointerDown: handlePointerDown } = useMagnetic();

  return (
    <button
      {...props}
      type={type}
      ref={ref}
      onPointerDown={(event) => {
        handlePointerDown(event);
        onPointerDown?.(event);
      }}
      className={`${className} magnetic-button relative overflow-hidden`}
    >
      <span className="relative z-10">{children}</span>
      {ripple && (
        <span
          key={ripple.id}
          aria-hidden="true"
          className="click-ripple absolute h-24 w-24 rounded-full bg-white/35 pointer-events-none"
          style={{ left: ripple.x, top: ripple.y }}
        />
      )}
    </button>
  );
}
