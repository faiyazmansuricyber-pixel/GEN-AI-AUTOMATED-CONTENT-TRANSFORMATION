"use client";

import { useEffect } from "react";
import { useReducedMotion } from "@/lib/hooks";

export default function SectionMotion() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(".editorial-shell main section[id]"),
    );
    if (!sections.length) return;

    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("section-revealed"));
      return;
    }

    const visibleSections = new Set<HTMLElement>();
    let previousScrollY = window.scrollY;
    let scrollDirection = 1;
    let frame = 0;

    const updateParallax = () => {
      const viewportCenter = window.innerHeight / 2;
      const positions = Array.from(visibleSections, (section) => ({
        section,
        center: section.getBoundingClientRect().top + section.offsetHeight / 2,
      }));

      positions.forEach(({ section, center }) => {
        const offset = Math.max(-8, Math.min(8, (viewportCenter - center) * 0.018));
        section.style.setProperty("--section-parallax-y", `${offset}px`);
      });
      frame = 0;
    };

    const handleScroll = () => {
      const nextScrollY = window.scrollY;
      if (nextScrollY !== previousScrollY) {
        scrollDirection = nextScrollY > previousScrollY ? 1 : -1;
        previousScrollY = nextScrollY;
      }
      if (!frame && visibleSections.size) frame = window.requestAnimationFrame(updateParallax);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          if (!section.classList.contains("section-revealed")) {
            section.style.setProperty("--section-entry-y", `${scrollDirection * 18}px`);
            section.classList.add("section-revealed");
          }
          section.classList.add("section-reveal-active");
          visibleSections.add(section);
        } else {
          section.classList.remove("section-reveal-active");
          visibleSections.delete(section);
        }
      });
      if (!frame && visibleSections.size) frame = window.requestAnimationFrame(updateParallax);
    }, { threshold: 0.04 });

    sections.forEach((section) => {
      section.classList.add("section-reveal-target");
      observer.observe(section);
    });

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
      sections.forEach((section) => {
        section.classList.remove("section-reveal-target", "section-revealed", "section-reveal-active");
        section.style.removeProperty("--section-entry-y");
        section.style.removeProperty("--section-parallax-y");
      });
    };
  }, [reducedMotion]);

  return null;
}
