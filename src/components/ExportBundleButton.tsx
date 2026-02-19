'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

const TONES = ['professional', 'casual', 'bold', 'minimal'] as const;
const LANGUAGES = [
  { code: 'es', label: 'Spanish (es)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'de', label: 'German (de)' },
  { code: 'ja', label: 'Japanese (ja)' },
  { code: 'ko', label: 'Korean (ko)' },
  { code: 'pt-BR', label: 'Portuguese (Brazil) (pt-BR)' },
  { code: 'it', label: 'Italian (it)' },
  { code: 'zh-Hans', label: 'Chinese (Simplified) (zh-Hans)' },
  { code: 'nl', label: 'Dutch (nl)' },
  { code: 'ar', label: 'Arabic (ar)' },
] as const;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export default function ExportBundleButton({
  planId,
  appName,
}: {
  planId: string;
  appName: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTones, setSelectedTones] = useState<string[]>([...TONES]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [includeAssets, setIncludeAssets] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tonesAllChecked = useMemo(
    () => TONES.every((t) => selectedTones.includes(t)),
    [selectedTones]
  );

  const toggleTone = (tone: string) => {
    setSelectedTones((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone]
    );
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const download = async () => {
    setExporting(true);
    setError(null);

    try {
      const res = await fetch('/api/export-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          tones: selectedTones,
          languages: selectedLanguages,
          includeAssets,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marketing-pack-${slugify(appName) || planId}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto h-auto text-sm px-4 py-2.5 sm:py-2 rounded-lg"
      >
        ⬇️ Download Full Pack
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => (!exporting ? setOpen(false) : null)}
            aria-label="Close"
          />

          <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="p-5 border-b border-slate-700 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">Download Full Pack</h3>
                <p className="text-sm text-slate-400 mt-1 break-words">
                  Includes your brief, tone variants, translations, and assets (PNG).
                </p>
              </div>
              <Button
                onClick={() => setOpen(false)}
                disabled={exporting}
                variant="ghost"
                size="icon-sm"
                className="text-slate-400 hover:text-slate-200 disabled:opacity-50"
              >
                ✕
              </Button>
            </div>

            <div className="p-5 space-y-6">
              {/* Tones */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Tones</div>
                    <div className="text-xs text-slate-400">Default: all</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto text-xs text-indigo-400 hover:text-indigo-300 px-0"
                    onClick={() =>
                      setSelectedTones(tonesAllChecked ? [] : [...TONES])
                    }
                    disabled={exporting}
                  >
                    {tonesAllChecked ? 'Clear' : 'Select all'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TONES.map((tone) => (
                    <label
                      key={tone}
                      className="flex items-center gap-2 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTones.includes(tone)}
                        onChange={() => toggleTone(tone)}
                        disabled={exporting}
                      />
                      <span className="text-sm text-slate-200 capitalize">{tone}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <div className="mb-3">
                  <div className="text-sm font-semibold text-white">Translations</div>
                  <div className="text-xs text-slate-400">Default: none</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LANGUAGES.map((lang) => (
                    <label
                      key={lang.code}
                      className="flex items-center gap-2 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(lang.code)}
                        onChange={() => toggleLanguage(lang.code)}
                        disabled={exporting}
                      />
                      <span className="text-sm text-slate-200">{lang.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Assets */}
              <div className="flex items-center justify-between gap-3 bg-slate-800/30 border border-slate-700/60 rounded-xl px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-white">Include assets</div>
                  <div className="text-xs text-slate-400">Generates PNG social images</div>
                </div>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeAssets}
                    onChange={() => setIncludeAssets((v) => !v)}
                    disabled={exporting}
                  />
                  <span className="text-sm text-slate-200">Yes</span>
                </label>
              </div>

              {error && (
                <div className="text-sm text-red-300 bg-red-950/30 border border-red-900/40 rounded-xl p-3 whitespace-pre-wrap">
                  {error}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                {exporting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-indigo-500/40 border-t-indigo-400 animate-spin" />
                    Generating pack… this may take a minute.
                  </span>
                ) : (
                  'This runs multiple AI calls if tones/translations are selected.'
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setOpen(false)}
                  disabled={exporting}
                  variant="secondary"
                  className="h-auto text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={download}
                  disabled={exporting}
                  className="h-auto text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {exporting ? 'Working…' : 'Download ZIP'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
