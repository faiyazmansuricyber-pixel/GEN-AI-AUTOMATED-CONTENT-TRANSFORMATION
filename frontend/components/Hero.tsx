"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  BarChart3,
  Briefcase,
  FileText,
  MessageSquare,
  Presentation,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa6";
import MagneticButton from "@/components/MagneticButton";
import { useReducedMotion } from "@/lib/hooks";

const formatCards = [
  { label: "LinkedIn Post", icon: <FaLinkedinIn />, color: "linkedin", x: -236, y: 74, rotation: -18, yRotation: -20, depth: 0, z: 1 },
  { label: "Twitter/X Thread", icon: <MessageSquare />, color: "twitter", x: -158, y: 42, rotation: -12, yRotation: -14, depth: 1, z: 3 },
  { label: "Advisory Doc", icon: <ShieldCheck />, color: "advisory", x: -79, y: 18, rotation: -6, yRotation: -7, depth: 2, z: 5 },
  { label: "Executive Summary", icon: <Briefcase />, color: "summary", x: 0, y: 0, rotation: 0, yRotation: 0, depth: 3, z: 7 },
  { label: "Presentation Slides", icon: <Presentation />, color: "slides", x: 79, y: 18, rotation: 6, yRotation: 7, depth: 4, z: 6 },
  { label: "Infographic Layout", icon: <BarChart3 />, color: "infographic", x: 158, y: 42, rotation: 12, yRotation: 14, depth: 5, z: 4 },
  { label: "Video Package", icon: <Video />, color: "video", x: 236, y: 74, rotation: 18, yRotation: 20, depth: 6, z: 2 },
];

type HeroCardStyle = CSSProperties & {
  "--fan-x": string;
  "--fan-y": string;
  "--fan-rotation": string;
  "--fan-depth": string;
  "--fan-y-rotation": string;
  "--fan-z": string;
  "--fan-x-tablet": string;
  "--fan-y-tablet": string;
  "--fan-rotation-tablet": string;
  "--fan-x-mobile": string;
  "--fan-y-mobile": string;
  "--fan-rotation-mobile": string;
};

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const reducedMotion = useReducedMotion();
  const [isActive, setIsActive] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    let intersects = false;
    const updateActive = () => setIsActive(intersects && document.visibilityState === "visible");
    if (!("IntersectionObserver" in window)) {
      setIsActive(true);
      setIsReady(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      updateActive();
      if (intersects) setIsReady(true);
    }, { threshold: 0.05 });
    const handleVisibility = () => updateActive();

    observer.observe(hero);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const hero = heroRef.current;
    if (!stage || !hero || reducedMotion || !isActive || !window.matchMedia("(pointer: fine)").matches) return;

    let pointerFrame = 0;
    let scrollFrame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const updatePointer = () => {
      const bounds = stage.getBoundingClientRect();
      const x = (pointerX - bounds.left) / bounds.width - 0.5;
      const y = (pointerY - bounds.top) / bounds.height - 0.5;
      stage.style.setProperty("--hero-tilt-x", `${-y * 14}deg`);
      stage.style.setProperty("--hero-tilt-y", `${x * 14}deg`);
      pointerFrame = 0;
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(updatePointer);
    };
    const resetPointer = () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      stage.style.setProperty("--hero-tilt-x", "0deg");
      stage.style.setProperty("--hero-tilt-y", "0deg");
    };
    const updateSpread = () => {
      const bounds = hero.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -bounds.top / (bounds.height * 0.55)));
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        const spread = index - (formatCards.length - 1) / 2;
        card.style.setProperty("--fan-scroll-x", `${spread * progress * 12}px`);
        card.style.setProperty("--fan-scroll-y", `${spread * progress * -8}px`);
      });
      scrollFrame = 0;
    };
    const handleScroll = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateSpread);
    };

    stage.addEventListener("pointermove", handlePointerMove, { passive: true });
    stage.addEventListener("pointerleave", resetPointer);
    window.addEventListener("scroll", handleScroll, { passive: true });
    updateSpread();

    return () => {
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      stage.removeEventListener("pointermove", handlePointerMove);
      stage.removeEventListener("pointerleave", resetPointer);
      window.removeEventListener("scroll", handleScroll);
      resetPointer();
    };
  }, [isActive, reducedMotion]);

  const openWorkspace = () => {
    document.getElementById("workspace")?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <section
      ref={heroRef}
      className={`hero-band${isActive ? " hero-in-view" : ""}${isReady ? " hero-ready" : ""}`}
      aria-labelledby="hero-title"
    >
      <div className="hero-aurora" aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-copy">
          <p className="hero-eyebrow hero-enter" style={{ animationDelay: "80ms" }}>
            <Sparkles aria-hidden="true" />
            AI content studio · SIH 2026
          </p>
          <h1 id="hero-title" className="hero-title hero-enter" style={{ animationDelay: "160ms" }}>
            One source.
            <span>Every channel.</span>
          </h1>
          <p className="hero-description hero-enter" style={{ animationDelay: "240ms" }}>
            Shape raw content into seven polished deliverables, with analysis and source traceability built into the workflow.
          </p>
          <div className="hero-actions hero-enter" style={{ animationDelay: "320ms" }}>
            <MagneticButton onClick={openWorkspace} className="hero-cta">
              Open workspace <ArrowDown aria-hidden="true" />
            </MagneticButton>
            <span className="hero-proof"><span aria-hidden="true" /> Grounded in your source</span>
          </div>
          <div className="hero-steps hero-enter" style={{ animationDelay: "400ms" }}>
            <span>01 · Add source</span>
            <i aria-hidden="true" />
            <span>02 · Configure</span>
            <i aria-hidden="true" />
            <span>03 · Review outputs</span>
          </div>
        </div>

        <div className={`hero-fan-stage${isActive ? " hero-fan-active" : ""}`} ref={stageRef} aria-label="Seven content output formats">
          <div className="hero-fan-orbit" aria-hidden="true" />
          <div className="hero-fan">
            {formatCards.map((card, index) => {
              const style: HeroCardStyle = {
                "--fan-x": `${card.x}px`,
                "--fan-y": `${card.y}px`,
                "--fan-rotation": `${card.rotation}deg`,
                "--fan-depth": String(card.depth),
                "--fan-y-rotation": `${card.yRotation}deg`,
                "--fan-z": String(card.z),
                "--fan-x-tablet": `${card.x * 0.72}px`,
                "--fan-y-tablet": `${card.y * 0.8}px`,
                "--fan-rotation-tablet": `${card.rotation * 0.8}deg`,
                "--fan-x-mobile": `${card.x * 0.42}px`,
                "--fan-y-mobile": `${card.y * 0.6}px`,
                "--fan-rotation-mobile": `${card.rotation * 0.65}deg`,
              };

              return (
                <div
                  key={card.label}
                  ref={(element) => {
                    cardRefs.current[index] = element;
                  }}
                  className={`hero-format-card hero-card-${card.color} hero-enter`}
                  style={style}
                >
                  <div className="hero-card-topline">
                    <span className="hero-card-icon">{card.icon}</span>
                    <span className="hero-card-menu" aria-hidden="true"><i /><i /><i /></span>
                  </div>
                  <strong>{card.label}</strong>
                  <span className="hero-preview-line hero-preview-wide" />
                  <span className="hero-preview-line hero-preview-mid" />
                  <span className="hero-preview-footer">
                    <span /><span /><span />
                  </span>
                </div>
              );
            })}
          </div>
          <div className="hero-fan-caption"><FileText aria-hidden="true" /> One source, seven ways forward</div>
        </div>
      </div>
      <svg className="hero-bottom-curve" viewBox="0 0 1440 96" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 42C240 94 470 96 720 60C970 24 1180 18 1440 54V96H0V42Z" />
      </svg>
    </section>
  );
}
