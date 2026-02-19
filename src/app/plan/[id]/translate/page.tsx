'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import type { MarketingPlan } from '@/lib/types';
import { DraftSkeleton } from '@/components/Skeleton';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';
import { usePlan } from '@/hooks/usePlan';
import DismissableTip from '@/components/DismissableTip';

type TranslationSection =
  | 'app_store_description'
  | 'short_description'
  | 'keywords'
  | 'whats_new'
  | 'feature_bullets';

type LanguageCode =
  | 'es'
  | 'fr'
  | 'de'
  | 'ja'
  | 'ko'
  | 'pt-BR'
  | 'it'
  | 'zh-Hans'
  | 'nl'
  | 'ar';

const LANGUAGE_OPTIONS: {
  code: LanguageCode;
  label: string;
  flag: string;
  help?: string;
}[] = [
    { code: 'es', label: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', label: 'French', flag: '🇫🇷' },
    { code: 'de', label: 'German', flag: '🇩🇪' },
    { code: 'it', label: 'Italian', flag: '🇮🇹' },
    { code: 'nl', label: 'Dutch', flag: '🇳🇱' },
    { code: 'pt-BR', label: 'Portuguese (Brazil)', flag: '🇧🇷' },
    { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', label: 'Korean', flag: '🇰🇷' },
    { code: 'zh-Hans', label: 'Chinese (Simplified)', flag: '🇨🇳' },
    { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  ];

const SECTION_OPTIONS: {
  key: TranslationSection;
  label: string;
  help: string;
}[] = [
    {
      key: 'app_store_description',
      label: 'App Store description',
      help: 'Full description for the store listing.',
    },
    {
      key: 'short_description',
      label: 'Short description',
      help: 'A concise store-friendly tagline.',
    },
    {
      key: 'keywords',
      label: 'Keywords',
      help: 'Comma-separated keywords for ASO.',
    },
    {
      key: 'whats_new',
      label: "What's New",
      help: 'Release notes / update text.',
    },
    {
      key: 'feature_bullets',
      label: 'Feature bullets',
      help: 'A bullet list of benefits/features.',
    },
  ];

function sectionToTitle(section: TranslationSection) {
  return SECTION_OPTIONS.find((s) => s.key === section)?.label || section;
}

function languageToTitle(code: LanguageCode) {
  const opt = LANGUAGE_OPTIONS.find((l) => l.code === code);
  return opt ? `${opt.flag} ${opt.label}` : code;
}

export default function TranslatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { plan, loading: planLoading, error: planError, reload: loadPlan } = usePlan(id);

  const [selectedLanguages, setSelectedLanguages] = useState<Record<LanguageCode, boolean>>({
    es: true,
    fr: false,
    de: false,
    ja: false,
    ko: false,
    'pt-BR': false,
    it: false,
    'zh-Hans': false,
    nl: false,
    ar: false,
  });

  const [selectedSections, setSelectedSections] = useState<Record<TranslationSection, boolean>>({
    app_store_description: true,
    short_description: true,
    keywords: true,
    whats_new: true,
    feature_bullets: true,
  });

  const [translations, setTranslations] = useState<
    Partial<Record<LanguageCode, Partial<Record<TranslationSection, string>>>>
  >({});
  const [activeLang, setActiveLang] = useState<LanguageCode>('es');
  const [isCached, setIsCached] = useState(false);

  const storageKey = `translate-${id}`;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        translations: Partial<Record<LanguageCode, Partial<Record<TranslationSection, string>>>>;
        activeLang?: LanguageCode;
      };
      if (parsed?.translations) setTranslations(parsed.translations);
      if (parsed?.activeLang) setActiveLang(parsed.activeLang);
      setIsCached(true);
    } catch {
      /* ignore */
    }
  }, [id]);

  const requestedLanguages = useMemo(() => {
    return LANGUAGE_OPTIONS.map((l) => l.code).filter((c) => selectedLanguages[c]);
  }, [selectedLanguages]);

  const requestedSections = useMemo(() => {
    return SECTION_OPTIONS.map((s) => s.key).filter((k) => selectedSections[k]);
  }, [selectedSections]);

  const handleGenerate = async () => {
    setError('');

    if (requestedLanguages.length === 0) {
      setError('Please select at least one language.');
      return;
    }

    if (requestedSections.length === 0) {
      setError('Please select at least one section.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/generate-translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: id,
          targetLanguages: requestedLanguages,
          sections: requestedSections,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate translations');

      const t = data?.translations as Record<string, Record<string, string>>;
      const next: Partial<
        Record<LanguageCode, Partial<Record<TranslationSection, string>>>
      > = {};

      for (const lang of requestedLanguages) {
        const langObj = t?.[lang];
        if (!langObj) continue;
        next[lang] = {};
        for (const section of requestedSections) {
          const val = langObj?.[section];
          if (typeof val === 'string') {
            next[lang]![section] = val;
          }
        }
      }

      const first = requestedLanguages[0] || 'es';
      sessionStorage.setItem(storageKey, JSON.stringify({ translations: next, activeLang: first }));
      setTranslations(next);
      setActiveLang(first);
      setIsCached(false);
      toastSuccess('Translations generated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate translations';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAllForLanguage = async (lang: LanguageCode) => {
    const langTranslations = translations[lang] || {};

    const orderedKeys = SECTION_OPTIONS.map((s) => s.key).filter(
      (k) => typeof langTranslations[k] === 'string' && (langTranslations[k] || '').trim().length > 0
    );

    if (orderedKeys.length === 0) return;

    const text = orderedKeys
      .map((k) => `## ${sectionToTitle(k)}\n\n${langTranslations[k]}\n`)
      .join('\n');

    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (planLoading) {
    return <DraftSkeleton />;
  }

  if (planError) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <ErrorRetry error={planError} onRetry={loadPlan} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-slate-400 mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  const hasResults = Object.keys(translations).length > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <DismissableTip id="translate-tip">Translate your App Store copy into 10 languages — ready to paste directly into your store listing without any editing.</DismissableTip>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">🌍 Translate / Localise</h1>
            {hasResults && isCached && (
              <span className="text-xs text-slate-500">Cached · Generate to refresh</span>
            )}
          </div>
          <p className="text-slate-400">
            {plan.config.app_name} — Generate localised app store copy in multiple languages
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Generating…' : '✨ Generate Translations'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Languages</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((l) => (
                <label
                  key={l.code}
                  className="flex items-start gap-3 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLanguages[l.code]}
                    onChange={(e) =>
                      setSelectedLanguages((prev) => ({
                        ...prev,
                        [l.code]: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm text-white">
                      {l.flag} {l.label}
                    </div>
                    {l.help && <div className="text-xs text-slate-500">{l.help}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Sections</h2>
            <div className="space-y-2">
              {SECTION_OPTIONS.map((s) => (
                <label
                  key={s.key}
                  className="flex items-start gap-3 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSections[s.key]}
                    onChange={(e) =>
                      setSelectedSections((prev) => ({
                        ...prev,
                        [s.key]: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm text-white">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.help}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Tip: Choose just a couple of languages first to keep generation fast.
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {requestedLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`text-sm border rounded-xl px-3 py-2 transition-colors ${activeLang === lang
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-700/40 text-slate-200'
                    }`}
                >
                  {languageToTitle(lang)}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleCopyAllForLanguage(activeLang)}
              disabled={!translations[activeLang] || Object.keys(translations[activeLang] || {}).length === 0}
              className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
              title={`Copy all sections for ${activeLang}`}
            >
              {copiedAll ? `✓ Copied!` : `📋 Copy All for ${languageToTitle(activeLang)}`}
            </button>
          </div>

          {SECTION_OPTIONS.map((s) => {
            const value = translations[activeLang]?.[s.key] || '';
            const hasValue = value.trim().length > 0;

            return (
              <div
                key={s.key}
                className={`rounded-2xl overflow-hidden border ${hasValue
                    ? 'bg-slate-800/30 border-slate-700/60'
                    : 'bg-slate-900/20 border-slate-700/30'
                  }`}
              >
                <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-700/40">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.help}</div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!hasValue) return;
                      await navigator.clipboard.writeText(value);
                    }}
                    disabled={!hasValue}
                    className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    title="Copy section"
                  >
                    📋 Copy
                  </button>
                </div>

                <div className="p-4">
                  <textarea
                    value={value}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [activeLang]: {
                          ...(prev[activeLang] || {}),
                          [s.key]: e.target.value,
                        },
                      }))
                    }
                    placeholder={
                      requestedSections.includes(s.key)
                        ? 'Not generated yet…'
                        : 'Not requested…'
                    }
                    className="w-full min-h-[140px] bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasResults && (
        <div className="text-center text-sm text-slate-600 mt-10 mb-6">
          Select languages + sections, then generate.
        </div>
      )}

      <div className="text-center text-sm text-slate-600 mt-10 mb-6">
        Localised copy is a starting point — review for accuracy before publishing.
      </div>
    </div>
  );
}
