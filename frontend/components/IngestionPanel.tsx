"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMouseSpotlight, useTilt } from '@/lib/hooks';
import MagneticButton from '@/components/MagneticButton';
import { 
  FileText, Upload, CheckSquare, Square, Sliders, Sparkles, 
  FileCheck, FileOutput, Presentation, 
  BarChart3, Video, File, X, Loader2,
  Volume2, Users, Globe, Layers, Target, Wand2,
  CheckCircle2, AlertCircle, Info, Shield, Search, ChevronDown, RotateCcw
} from 'lucide-react';

export interface IngestParameters {
  tone: string;
  audience: string;
  language: string;
  detail_level: string;
  objective: string;
  style: string;
}

interface IngestionPanelProps {
  onSubmit: (inputData: { text?: string; file?: File }, outputTypes: string[], params: IngestParameters) => void;
  isLoading: boolean;
  loadingStep: string;
}

const DEFAULT_PARAMETERS: IngestParameters = {
  tone: 'formal',
  audience: 'executive',
  language: 'English',
  detail_level: 'medium',
  objective: 'inform',
  style: 'professional'
};

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'inspirational', label: 'Inspirational' },
];

const AUDIENCE_OPTIONS = [
  { value: 'executive', label: 'Executive / C-Suite' },
  { value: 'general', label: 'General Public' },
  { value: 'technical', label: 'Technical / Engineers' },
  { value: 'policy_makers', label: 'Policy Makers' },
];

const DETAIL_OPTIONS = [
  { value: 'brief', label: 'Brief' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
];

const OBJECTIVE_OPTIONS = [
  { value: 'inform', label: 'Inform' },
  { value: 'warn', label: 'Warn / Alert' },
  { value: 'persuade', label: 'Persuade' },
  { value: 'summarize', label: 'Summarize' },
];

const STYLE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'analytical', label: 'Analytical' },
];

const OUTPUT_OPTIONS = [
  { 
    id: 'linkedin_post', 
    label: 'LinkedIn Post', 
    brandColor: '#0A66C2',
    bgColor: 'bg-[#0A66C2]',
    borderColor: 'border-[#0A66C2]',
    tintColor: 'bg-blue-50/80',
    icon: function LinkedinLogo() {
      return (
        <svg className="h-4 w-4 fill-current text-white" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
        </svg>
      );
    }, 
    desc: 'Professional post with hook, structure & call-to-action' 
  },
  { 
    id: 'twitter_thread', 
    label: 'Twitter / X Thread', 
    brandColor: '#000000',
    bgColor: 'bg-slate-900',
    borderColor: 'border-slate-900',
    tintColor: 'bg-slate-100/90',
    icon: function XLogo() {
      return (
        <svg className="h-3.5 w-3.5 fill-current text-white" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    }, 
    desc: '3–6 bite-sized tweets optimized for 280 characters' 
  },
  { 
    id: 'advisory', 
    label: 'Advisory Doc', 
    brandColor: '#d97706',
    bgColor: 'bg-amber-600',
    borderColor: 'border-amber-600',
    tintColor: 'bg-amber-50/80',
    icon: function AdvisoryIcon() {
      return <FileCheck className="h-4 w-4 text-white" />;
    }, 
    desc: 'Structured summary, impact analysis & action items' 
  },
  { 
    id: 'executive_summary', 
    label: 'Executive Summary', 
    brandColor: '#059669',
    bgColor: 'bg-emerald-600',
    borderColor: 'border-emerald-600',
    tintColor: 'bg-emerald-50/80',
    icon: function ExecIcon() {
      return <FileOutput className="h-4 w-4 text-white" />;
    }, 
    desc: '150–250 word high-level bottom-line report' 
  },
  { 
    id: 'presentation', 
    label: 'Presentation Slides', 
    brandColor: '#7c3aed',
    bgColor: 'bg-purple-600',
    borderColor: 'border-purple-600',
    tintColor: 'bg-purple-50/80',
    icon: function SlidesIcon() {
      return <Presentation className="h-4 w-4 text-white" />;
    }, 
    desc: '5–8 slide deck with bullets & speaker notes' 
  },
  { 
    id: 'infographic', 
    label: 'Infographic Layout', 
    brandColor: '#0891b2',
    bgColor: 'bg-cyan-600',
    borderColor: 'border-cyan-600',
    tintColor: 'bg-cyan-50/80',
    icon: function InfoIcon() {
      return <BarChart3 className="h-4 w-4 text-white" />;
    }, 
    desc: 'Headline, visual cards & layout blueprint' 
  },
  { 
    id: 'video_package', 
    label: 'Video Package', 
    brandColor: '#e11d48',
    bgColor: 'bg-rose-600',
    borderColor: 'border-rose-600',
    tintColor: 'bg-rose-50/80',
    icon: function VideoIcon() {
      return <Video className="h-4 w-4 text-white" />;
    }, 
    desc: 'Narration script, scene storyboard & subtitles' 
  },
];

const STEPS = [
  { id: 1, name: 'Ingest', label: 'Ingesting Content' },
  { id: 2, name: 'Analyze', label: 'Extracting Intelligence' },
  { id: 3, name: 'Generate', label: 'Generating Deliverables' },
  { id: 4, name: 'Verify', label: 'Verifying Provenance' },
  { id: 5, name: 'Deliver', label: 'Finalizing Deliverables' }
];

const LANGUAGES = [
  { value: 'English', native: 'English', label: 'English' },
  { value: 'Assamese', native: 'অসমীয়া', label: 'অসমীয়া (Assamese)' },
  { value: 'Bengali', native: 'বাংলা', label: 'বাংলা (Bengali)' },
  { value: 'Bodo', native: 'बड़ो', label: 'बड़ो (Bodo)' },
  { value: 'Dogri', native: 'डोगरी', label: 'डोगरी (Dogri)' },
  { value: 'Gujarati', native: 'ગુજરાતી', label: 'ગુજરાતી (Gujarati)' },
  { value: 'Hindi', native: 'हिन्दी', label: 'हिन्दी (Hindi)' },
  { value: 'Kannada', native: 'ಕನ್ನಡ', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'Kashmiri', native: 'کٲشُر', label: 'کٲشُر (Kashmiri)' },
  { value: 'Konkani', native: 'कोंकणी', label: 'कोंकणी (Konkani)' },
  { value: 'Maithili', native: 'मैथिली', label: 'मैथिली (Maithili)' },
  { value: 'Malayalam', native: 'മലയാളം', label: 'മലയാളം (Malayalam)' },
  { value: 'Manipuri/Meitei', native: 'মৈতৈলোন্', label: 'মৈতৈলোন্ (Manipuri/Meitei)' },
  { value: 'Marathi', native: 'मराठी', label: 'मराठी (Marathi)' },
  { value: 'Nepali', native: 'नेपाली', label: 'नेपाली (Nepali)' },
  { value: 'Odia', native: 'ଓଡ଼ିଆ', label: 'ଓଡ଼ିଆ (Odia)' },
  { value: 'Punjabi', native: 'ਪੰਜਾਬੀ', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { value: 'Sanskrit', native: 'संस्कृतम्', label: 'संस्कृतम् (Sanskrit)' },
  { value: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', label: 'ᱥᱟᱱᱛᱟᱲᱤ (Santali)' },
  { value: 'Sindhi', native: 'سنڌي', label: 'سنڌي (Sindhi)' },
  { value: 'Tamil', native: 'தமிழ்', label: 'தமிழ் (Tamil)' },
  { value: 'Telugu', native: 'తెలుగు', label: 'తెలుగు (Telugu)' },
  { value: 'Urdu', native: 'اردو', label: 'اردو (Urdu)' },
];

type OutputOption = (typeof OUTPUT_OPTIONS)[number];

function FormatOptionCard({
  option,
  selected,
  onToggle
}: {
  option: OutputOption;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const spotlightRef = useMouseSpotlight<HTMLButtonElement>();
  const tiltRef = useTilt<HTMLButtonElement>();
  const BrandIcon = option.icon;

  return (
    <button
      type="button"
      ref={(element) => {
        spotlightRef.current = element;
        tiltRef.current = element;
      }}
      aria-pressed={selected}
      onClick={() => onToggle(option.id)}
      className={`spotlight-card tilt-card p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex items-start gap-3 relative interactive-hover ${
        selected
          ? 'bg-white border-2 border-indigo-600 shadow-md ring-2 ring-indigo-100'
          : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white shadow-xs'
      }`}
    >
      <div className={`brand-icon-lift mt-0.5 p-2 rounded-lg ${option.bgColor} shadow-xs shrink-0 flex items-center justify-center`}>
        <BrandIcon />
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <p className={`text-xs font-bold ${selected ? 'text-slate-900' : 'text-slate-700'}`}>
          {option.label}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
          {option.desc}
        </p>
      </div>

      <div className="absolute top-3.5 right-3">
        {selected ? (
          <CheckSquare className="h-4 w-4 text-indigo-600" />
        ) : (
          <Square className="h-4 w-4 text-slate-300" />
        )}
      </div>
    </button>
  );
}

export default function IngestionPanel({ onSubmit, isLoading, loadingStep }: IngestionPanelProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([
    'linkedin_post', 'twitter_thread', 'advisory', 'presentation'
  ]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parameters
  const [parameters, setParameters] = useState<IngestParameters>(DEFAULT_PARAMETERS);

  // Dropdown states for all 6 parameters
  type ParamKey = 'tone' | 'audience' | 'language' | 'detail_level' | 'objective' | 'style';
  const [openDropdown, setOpenDropdown] = useState<ParamKey | null>(null);
  const [langSearch, setLangSearch] = useState('');
  const paramsContainerRef = useRef<HTMLDivElement>(null);
  const langSearchRef = useRef<HTMLInputElement>(null);
  const paramsSpotlightRef = useMouseSpotlight<HTMLDivElement>();

  const selectedLang = LANGUAGES.find(l => l.value === parameters.language) || LANGUAGES[0];

  const filteredLanguages = langSearch.trim()
    ? LANGUAGES.filter(l => {
        const q = langSearch.toLowerCase();
        return l.value.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.label.toLowerCase().includes(q);
      })
    : LANGUAGES;

  const handleSelectParam = useCallback((key: ParamKey, value: string) => {
    setParameters(prev => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
    setLangSearch('');
  }, []);

  const handleResetDefaults = () => {
    setParameters(DEFAULT_PARAMETERS);
    setOpenDropdown(null);
    setLangSearch('');
  };

  useEffect(() => {
    if (openDropdown === 'language') {
      langSearchRef.current?.focus();
    }

    if (!openDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (paramsContainerRef.current && !paramsContainerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setLangSearch('');
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setLangSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openDropdown]);

  const toggleOutputType = (id: string) => {
    setSelectedOutputs(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllOutputs = () => {
    setSelectedOutputs(OUTPUT_OPTIONS.map(o => o.id));
  };

  const deselectAllOutputs = () => {
    setSelectedOutputs([]);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'text' && !inputText.trim()) return;
    if (activeTab === 'file' && !selectedFile) return;
    if (selectedOutputs.length === 0) return;

    onSubmit(
      activeTab === 'text' ? { text: inputText } : { file: selectedFile! },
      selectedOutputs,
      parameters
    );
  };

  // Determine current active step index (1-based)
  const getActiveStepIndex = () => {
    if (!isLoading) return 0;
    const stepLower = loadingStep.toLowerCase();
    if (stepLower.includes('ingest')) return 1;
    if (stepLower.includes('extract') || stepLower.includes('analyz')) return 2;
    if (stepLower.includes('generat')) return 3;
    if (stepLower.includes('verif')) return 4;
    return 3;
  };

  const activeStepIdx = getActiveStepIndex();

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  return (
    <div className="w-full bg-white rounded-2xl p-6 lg:p-7 shadow-lg mb-8 border border-slate-200/90 relative overflow-hidden">
      {/* Decorative top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500" />

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Multimodal Content Ingestion & AI Transformation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload raw content, customize target options, and produce multi-channel deliverables in seconds.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* INPUT METHOD SECTION */}
        <div>
          {/* Welcoming Empty State Card (Visible only when text box is empty and no file uploaded) */}
          {!inputText.trim() && !selectedFile && (
            <div className="aurora-surface mb-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-slate-50 border border-indigo-100 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 animate-fade-in-up">
              <div className="aurora-layer aurora-surface-glow" aria-hidden="true" />
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Transform any source into 7 ready-to-use formats
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Paste raw text, threat intelligence, policy briefs, or upload files to generate instant multi-channel deliverables.
                  </p>
                </div>
              </div>

              {/* Purely Cosmetic Inspiration Chips */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Inspiration:</span>
                {[
                  { label: 'Threat Advisory', icon: Shield },
                  { label: 'Policy Brief', icon: FileText },
                  { label: 'Incident Report', icon: AlertCircle },
                  { label: 'Research Paper', icon: Search }
                ].map((chip, idx) => {
                  const ChipIcon = chip.icon;
                  return (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 border border-indigo-100/90 text-indigo-950 text-xs font-semibold shadow-2xs hover:border-indigo-300 transition select-none cursor-default"
                    >
                      <ChipIcon className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{chip.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Paste Raw Text</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>Upload Document / Image / Video</span>
            </button>
          </div>

          {/* Text Input Tab */}
          {activeTab === 'text' && (
            <div>
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your unstructured report, policy brief, research paper, transcript, or internal document here..."
                  rows={6}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-xs lg:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs transition leading-relaxed font-sans"
                />
              </div>
              <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Info className="h-3.5 w-3.5 text-indigo-500" /> Supports articles, transcripts, notes, and unstructured domain reports.
                </span>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    <strong className="text-indigo-700">{wordCount}</strong> words
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    <strong className="text-slate-700">{charCount}</strong> chars
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Tab */}
          {activeTab === 'file' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                dragOver 
                  ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-200' 
                  : selectedFile 
                    ? 'border-emerald-500 bg-emerald-50/30' 
                    : 'border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-slate-100/50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.mp4,.mov,.avi"
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-xl border border-emerald-300 shadow-sm text-left max-w-md w-full">
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                    <File className="h-6 w-6" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-indigo-100/70 text-indigo-600 flex items-center justify-center mb-3 border border-indigo-200 shadow-xs">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drag & drop files here
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supported file formats: <span className="font-semibold text-slate-700">PDF, DOCX, PNG/JPG, MP4</span>
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* OUTPUT FORMAT SELECTOR CARDS WITH BRAND LOGOS */}
        <div className="pt-3 border-t border-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>Target Output Formats</span>
              <span className="bg-indigo-100 text-indigo-800 text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold border border-indigo-200">
                {selectedOutputs.length} of {OUTPUT_OPTIONS.length} selected
              </span>
            </h3>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={selectAllOutputs}
                className="text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={deselectAllOutputs}
                className="text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {OUTPUT_OPTIONS.map((opt) => {
              const isSelected = selectedOutputs.includes(opt.id);
              return (
                <FormatOptionCard
                  key={opt.id}
                  option={opt}
                  selected={isSelected}
                  onToggle={toggleOutputType}
                />
              );
            })}
          </div>
        </div>

        {/* GENERATION PARAMETERS (COHESIVE CUSTOM DROPDOWNS BLOCK) */}
        <div className="pt-3 border-t border-slate-200/80" ref={paramsContainerRef}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-indigo-600" />
              <span>Generation Parameters</span>
            </h3>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition cursor-pointer"
              title="Reset parameters to original defaults"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset to defaults</span>
            </button>
          </div>

          <div ref={paramsSpotlightRef} className="spotlight-card relative bg-slate-50/70 p-4 rounded-xl border border-slate-200/90 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. Tone */}
            <div className="relative">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1.5">
                <Volume2 className="h-3.5 w-3.5 text-indigo-600" />
                <span>Tone</span>
              </label>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'tone' ? null : 'tone')}
                className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all text-left ${
                  openDropdown === 'tone'
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950'
                    : 'border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <span className="truncate font-semibold text-slate-800">
                  {TONE_OPTIONS.find(o => o.value === parameters.tone)?.label || 'Formal'}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${openDropdown === 'tone' ? 'rotate-180 text-indigo-600' : ''}`} />
              </button>

              {openDropdown === 'tone' && (
                <div
                  className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 p-1 animate-in fade-in slide-in-from-top-1 overflow-hidden min-w-[180px]"
                  style={{ animationDuration: '150ms' }}
                >
                  <div className="space-y-0.5">
                    {TONE_OPTIONS.map((opt) => {
                      const isActive = opt.value === parameters.tone;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectParam('tone', opt.value)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isActive
                              ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold'
                              : 'hover:bg-slate-50 border border-transparent text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">Voice style & vocabulary</p>
            </div>

            {/* 2. Audience */}
            <div className="relative">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1.5">
                <Users className="h-3.5 w-3.5 text-purple-600" />
                <span>Audience</span>
              </label>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'audience' ? null : 'audience')}
                className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all text-left ${
                  openDropdown === 'audience'
                    ? 'border-purple-500 ring-2 ring-purple-500/20 text-purple-950'
                    : 'border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <span className="truncate font-semibold text-slate-800">
                  {AUDIENCE_OPTIONS.find(o => o.value === parameters.audience)?.label || 'Executive / C-Suite'}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${openDropdown === 'audience' ? 'rotate-180 text-purple-600' : ''}`} />
              </button>

              {openDropdown === 'audience' && (
                <div
                  className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 p-1 animate-in fade-in slide-in-from-top-1 overflow-hidden min-w-[200px]"
                  style={{ animationDuration: '150ms' }}
                >
                  <div className="space-y-0.5">
                    {AUDIENCE_OPTIONS.map((opt) => {
                      const isActive = opt.value === parameters.audience;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectParam('audience', opt.value)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isActive
                              ? 'bg-purple-50 border border-purple-200 text-purple-900 font-bold'
                              : 'hover:bg-slate-50 border border-transparent text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">Target reader perspective</p>
            </div>

            {/* 3. Language — Custom Dropdown with 2-Col Grid & Search */}
            <div className="relative">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1.5">
                <Globe className="h-3.5 w-3.5 text-cyan-600" />
                <span>Language</span>
              </label>

              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'language' ? null : 'language')}
                className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all text-left ${
                  openDropdown === 'language'
                    ? 'border-cyan-500 ring-2 ring-cyan-500/20 text-cyan-950'
                    : 'border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <span className="truncate">{selectedLang.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${openDropdown === 'language' ? 'rotate-180 text-cyan-600' : ''}`} />
              </button>

              {openDropdown === 'language' && (
                <div
                  className="absolute z-50 left-0 md:left-auto md:right-0 lg:left-0 lg:right-auto mt-1.5 w-[min(380px,90vw)] bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 animate-in fade-in slide-in-from-top-1 overflow-hidden"
                  style={{ animationDuration: '150ms' }}
                >
                  {/* Search */}
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        ref={langSearchRef}
                        type="text"
                        value={langSearch}
                        onChange={(e) => setLangSearch(e.target.value)}
                        placeholder="Search languages…"
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-400 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Language Grid */}
                  <div className="max-h-[250px] overflow-y-auto p-1.5 grid grid-cols-2 gap-1">
                    {filteredLanguages.length === 0 ? (
                      <div className="col-span-2 text-center py-6 text-xs text-slate-400">
                        No languages match your search.
                      </div>
                    ) : (
                      filteredLanguages.map((lang) => {
                        const isActive = lang.value === parameters.language;
                        return (
                          <button
                            key={lang.value}
                            type="button"
                            onClick={() => handleSelectParam('language', lang.value)}
                            className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-cyan-50 border border-cyan-300 text-cyan-950 font-bold shadow-xs'
                                : 'hover:bg-slate-50 border border-transparent text-slate-700 hover:border-slate-200'
                            }`}
                          >
                            <span className="font-semibold text-xs shrink-0">{lang.native}</span>
                            {lang.value !== lang.native && (
                              <span className={`text-[10px] truncate ${isActive ? 'text-cyan-700' : 'text-slate-400'}`}>
                                ({lang.value})
                              </span>
                            )}
                            {isActive && (
                              <CheckCircle2 className="h-3 w-3 text-cyan-600 ml-auto shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 mt-1">Output quality may vary for less-resourced languages.</p>
            </div>

            {/* 4. Detail Level */}
            <div className="relative">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-600" />
                <span>Detail Level</span>
              </label>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'detail_level' ? null : 'detail_level')}
                className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all text-left ${
                  openDropdown === 'detail_level'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950'
                    : 'border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <span className="truncate font-semibold text-slate-800">
                  {DETAIL_OPTIONS.find(o => o.value === parameters.detail_level)?.label || 'Medium'}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${openDropdown === 'detail_level' ? 'rotate-180 text-emerald-600' : ''}`} />
              </button>

              {openDropdown === 'detail_level' && (
                <div
                  className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 p-1 animate-in fade-in slide-in-from-top-1 overflow-hidden min-w-[180px]"
                  style={{ animationDuration: '150ms' }}
                >
                  <div className="space-y-0.5">
                    {DETAIL_OPTIONS.map((opt) => {
                      const isActive = opt.value === parameters.detail_level;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectParam('detail_level', opt.value)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isActive
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold'
                              : 'hover:bg-slate-50 border border-transparent text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">Depth & length tuning</p>
            </div>

            {/* 5. Objective */}
            <div className="relative">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1.5">
                <Target className="h-3.5 w-3.5 text-rose-600" />
                <span>Objective</span>
              </label>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'objective' ? null : 'objective')}
                className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all text-left ${
                  openDropdown === 'objective'
                    ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-950'
                    : 'border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <span className="truncate font-semibold text-slate-800">
                  {OBJECTIVE_OPTIONS.find(o => o.value === parameters.objective)?.label || 'Inform'}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${openDropdown === 'objective' ? 'rotate-180 text-rose-600' : ''}`} />
              </button>

              {openDropdown === 'objective' && (
                <div
                  className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 p-1 animate-in fade-in slide-in-from-top-1 overflow-hidden min-w-[180px]"
                  style={{ animationDuration: '150ms' }}
                >
                  <div className="space-y-0.5">
                    {OBJECTIVE_OPTIONS.map((opt) => {
                      const isActive = opt.value === parameters.objective;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectParam('objective', opt.value)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isActive
                              ? 'bg-rose-50 border border-rose-200 text-rose-900 font-bold'
                              : 'hover:bg-slate-50 border border-transparent text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">Communication goal</p>
            </div>

            {/* 6. Style */}
            <div className="relative">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1.5">
                <Wand2 className="h-3.5 w-3.5 text-amber-600" />
                <span>Content Style</span>
              </label>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'style' ? null : 'style')}
                className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all text-left ${
                  openDropdown === 'style'
                    ? 'border-amber-500 ring-2 ring-amber-500/20 text-amber-950'
                    : 'border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <span className="truncate font-semibold text-slate-800">
                  {STYLE_OPTIONS.find(o => o.value === parameters.style)?.label || 'Professional'}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${openDropdown === 'style' ? 'rotate-180 text-amber-600' : ''}`} />
              </button>

              {openDropdown === 'style' && (
                <div
                  className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 p-1 animate-in fade-in slide-in-from-top-1 overflow-hidden min-w-[180px]"
                  style={{ animationDuration: '150ms' }}
                >
                  <div className="space-y-0.5">
                    {STYLE_OPTIONS.map((opt) => {
                      const isActive = opt.value === parameters.style;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectParam('style', opt.value)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isActive
                              ? 'bg-amber-50 border border-amber-200 text-amber-900 font-bold'
                              : 'hover:bg-slate-50 border border-transparent text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">Narrative framework</p>
            </div>
          </div>
        </div>

        {/* STEP PROGRESS INDICATOR & GENERATE ACTION BUTTON */}
        <div className="pt-3 border-t border-slate-200/80 space-y-4">
          {/* If Loading, show 5-Step Visual Progress Indicator */}
          {isLoading && (
            <div className="bg-slate-50 p-4 rounded-xl border border-indigo-200 shadow-xs animate-fadeIn">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span>{loadingStep || 'Processing Content Transformation...'}</span>
                </span>
                <span className="text-[11px] font-mono font-semibold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200">
                  Step {activeStepIdx || 1} of 5
                </span>
              </div>

              {/* 5-Step Timeline Bar */}
              <div className="grid grid-cols-5 gap-2 pt-1">
                {STEPS.map((s) => {
                  const isDone = s.id < activeStepIdx;
                  const isCurrent = s.id === activeStepIdx;
                  return (
                    <div key={s.id} className="flex flex-col items-center">
                      <div className={`w-full h-1.5 rounded-full mb-2 transition-all duration-300 ${
                        isDone 
                          ? 'bg-emerald-500' 
                          : isCurrent 
                            ? 'bg-indigo-600 step-active-pulse' 
                            : 'bg-slate-200'
                      }`} />
                      <div className="flex items-center gap-1">
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : isCurrent ? (
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span className={`text-[10px] font-bold truncate ${
                          isDone ? 'text-emerald-700' : isCurrent ? 'text-indigo-900 font-extrabold' : 'text-slate-400'
                        }`}>
                          {s.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <MagneticButton
            type="submit"
            disabled={isLoading || selectedOutputs.length === 0}
            className="w-full gradient-btn py-3.5 px-6 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Executing Multimodal Transformation Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
                <span>Generate {selectedOutputs.length} Output Deliverable{selectedOutputs.length === 1 ? '' : 's'} with Gemini 3 Flash</span>
              </>
            )}
          </MagneticButton>
        </div>
      </form>
    </div>
  );
}
