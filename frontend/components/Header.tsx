"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { History, Cpu, ShieldCheck, Sparkles } from 'lucide-react';
import { useReducedMotion } from '@/lib/hooks';

interface HeaderProps {
  onOpenHistory: () => void;
  onLoadDemo: () => void;
  backendStatus: boolean;
  backendError: string | null;
  modelName: string;
}

export default function Header({ onOpenHistory, onLoadDemo, backendStatus, backendError, modelName }: HeaderProps) {
  const [activeSection, setActiveSection] = useState('workspace');
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const activePillRef = useRef<HTMLSpanElement>(null);
  const scrollProgressRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const isConnectionError = backendError?.startsWith('Could not reach ') ||
    backendError === 'The backend health check timed out.';
  let statusLabel = 'Checking API';
  if (backendStatus) {
    statusLabel = backendError ? 'Gemini Not Ready' : 'API Connected';
  } else if (isConnectionError) {
    statusLabel = 'API Offline';
  } else if (backendError) {
    statusLabel = 'API Error';
  }

  useEffect(() => {
    const sectionIds = ['workspace', 'analysis', 'outputs', 'sources'];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      const visibleSections = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
      if (visibleSections[0]) setActiveSection(visibleSections[0].target.id);
    }, { rootMargin: '-20% 0px -65% 0px', threshold: 0 });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const updateScrollState = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollRange > 0 ? Math.min(1, window.scrollY / scrollRange) : 0;
        scrollProgressRef.current?.style.setProperty('transform', `scaleX(${progress})`);
        const nextIsScrolled = window.scrollY > 24;
        setIsScrolled((current) => current === nextIsScrolled ? current : nextIsScrolled);
        frame = 0;
      });
    };

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const pill = activePillRef.current;
    if (!nav || !pill) return;

    let frame = 0;
    const positionPill = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const activeLink = nav.querySelector<HTMLAnchorElement>(`a[href="#${activeSection}"]`);
        if (!activeLink) {
          pill.style.visibility = 'hidden';
          frame = 0;
          return;
        }
        const navBounds = nav.getBoundingClientRect();
        const linkBounds = activeLink.getBoundingClientRect();
        pill.style.width = `${linkBounds.width}px`;
        pill.style.transform = `translate3d(${linkBounds.left - navBounds.left + nav.scrollLeft}px, 0, 0)`;
        pill.style.visibility = 'visible';
        frame = 0;
      });
    };

    positionPill();
    nav.addEventListener('scroll', positionPill, { passive: true });
    window.addEventListener('resize', positionPill);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      nav.removeEventListener('scroll', positionPill);
      window.removeEventListener('resize', positionPill);
    };
  }, [activeSection]);

  useEffect(() => {
    const handlePopState = () => {
      const sectionId = window.location.hash.slice(1);
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [reducedMotion]);

  const handleSectionLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    const transitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => unknown;
    };
    const section = document.getElementById(sectionId);
    if (reducedMotion || !transitionDocument.startViewTransition || !section) return;

    event.preventDefault();
    transitionDocument.startViewTransition(() => {
      window.history.pushState(null, '', `#${sectionId}`);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <header className={`header-aurora sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-4 lg:px-8 shadow-xs ${isScrolled ? 'header-scrolled py-2' : 'py-3.5'}`}>
      <span ref={scrollProgressRef} className="header-scroll-progress" aria-hidden="true" />
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
        {/* Brand & Title */}
        <div className="flex items-center gap-3.5">
          {/* Logo Mark */}
          <div data-header-logo className="relative h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/20 shrink-0">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Content Transformation Platform Logo"
                width={44}
                height={44}
                className="h-full w-full object-cover rounded-[10px]"
                priority
              />
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center">
              <ShieldCheck className="h-2.5 w-2.5 text-white" />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg lg:text-xl font-extrabold tracking-tight text-slate-900">
                AI Content Intelligence Studio
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200/80 shadow-xs">
                SIH 2026 | PS 26154 | Team Cyphers
              </span>
            </div>
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
              <span className="font-medium text-slate-600">One source · intelligent analysis · seven deliverables</span>
              <span className="hidden md:inline-block w-1 h-1 rounded-full bg-slate-300" />
              <span className="inline-flex items-center gap-1 text-cyan-700 font-mono text-[11px] font-semibold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                <Cpu className="h-3 w-3 text-cyan-600" /> {modelName}
              </span>
            </p>
          </div>
        </div>

        <nav ref={navRef} className="workspace-nav relative flex w-full items-center gap-1 overflow-x-auto lg:w-auto" aria-label="Workspace sections">
          <span ref={activePillRef} className="workspace-nav-active-pill" aria-hidden="true" />
          {[
            { id: 'workspace', label: 'Workspace' },
            { id: 'analysis', label: 'Intelligence' },
            { id: 'outputs', label: 'Studio' },
            { id: 'sources', label: 'Evidence' }
          ].map((section) => (
            <a
              key={section.id}
              className="workspace-nav-link shrink-0 rounded-lg px-3 py-2 text-xs font-semibold"
              href={`#${section.id}`}
              aria-current={activeSection === section.id ? 'location' : undefined}
              onClick={(event) => handleSectionLinkClick(event, section.id)}
            >
              {section.label}
            </a>
          ))}
        </nav>

        {/* Actions & Status */}
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0">
          {/* Backend Status Indicator */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-xs"
            role="status"
            aria-live="polite"
            title={backendError || undefined}
          >
            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${backendStatus && !backendError ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className={backendStatus && !backendError ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
              {statusLabel}
            </span>
          </div>

          <button
            onClick={onLoadDemo}
            type="button"
            title="Load the saved demo result"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 shadow-xs text-indigo-800 hover:text-indigo-950 text-xs font-semibold transition cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Load Demo Result</span>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            type="button"
            aria-haspopup="dialog"
            title="Search and open past submissions"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 shadow-xs text-slate-700 hover:text-indigo-900 text-xs font-semibold transition cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-indigo-600" />
            <span>History</span>
          </button>
        </div>
      </div>
      {backendError && (
        <p className="relative z-10 mx-auto mt-2 max-w-7xl rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800" role="alert">
          {backendError}
        </p>
      )}
      <div className="aurora-layer header-aurora-glow" aria-hidden="true" />
    </header>
  );
}
