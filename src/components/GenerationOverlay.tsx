'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

type StepStatus = 'pending' | 'active' | 'complete' | 'error'

interface Step {
  id: string
  label: string
  status: StepStatus
}

interface GenerationOverlayProps {
  url: string
  onComplete: (planId: string) => void
  onError: (error: string) => void
}

type ScrapeResult = {
  name?: string
  icon?: string
  source?: string
  [key: string]: unknown
}

type PlanResult = {
  id: string
  error?: string
  [key: string]: unknown
}

function getErrorMessage(input: unknown, fallback: string): string {
  if (input && typeof input === 'object' && 'error' in input) {
    const maybeError = (input as { error?: unknown }).error
    if (typeof maybeError === 'string' && maybeError.trim()) return maybeError
  }
  return fallback
}

function truncateMiddle(input: string, max = 56) {
  const str = input.trim()
  if (str.length <= max) return str
  const head = Math.ceil((max - 1) / 2)
  const tail = Math.floor((max - 1) / 2)
  return `${str.slice(0, head)}…${str.slice(str.length - tail)}`
}

export default function GenerationOverlay({ url, onComplete, onError }: GenerationOverlayProps) {
  const abortRef = useRef<AbortController | null>(null)

  const [steps, setSteps] = useState<Step[]>([
    { id: 'scrape', label: 'Scraping website', status: 'active' },
    { id: 'analyze', label: 'Analysing product', status: 'pending' },
    { id: 'brief', label: 'Writing marketing brief', status: 'pending' },
    { id: 'strategy', label: 'Building content strategy', status: 'pending' },
    { id: 'final', label: 'Finalising your plan', status: 'pending' },
  ])

  const [appName, setAppName] = useState<string>('')
  const [appIcon, setAppIcon] = useState<string>('')

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
      abortRef.current?.abort()
    }
  }, [])

  const setStepStatus = (id: string, status: StepStatus) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
  }

  const activateNextAfter = (id: string) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev
      const next = prev[idx + 1]
      if (!next) return prev
      return prev.map((s, i) => {
        if (i === idx) return s
        if (i === idx + 1 && s.status === 'pending') return { ...s, status: 'active' }
        return s
      })
    })
  }

  useEffect(() => {
    if (!url) return

    const normalizedUrl = url.trim().match(/^https?:\/\//i) ? url.trim() : `https://${url.trim()}`

    const run = async () => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      try {
        // 1) Scrape
        setStepStatus('scrape', 'active')
        const scrapeRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: normalizedUrl }),
          signal: abortRef.current.signal,
        })

        const scraped = (await scrapeRes.json()) as ScrapeResult
        if (!scrapeRes.ok) throw new Error(getErrorMessage(scraped, 'Scraping failed'))

        if (!isMounted.current) return

        setAppName(typeof scraped.name === 'string' ? scraped.name : '')
        setAppIcon(typeof scraped.icon === 'string' ? scraped.icon : '')

        // Save to recent (keeps existing behavior from /analyze)
        try {
          const recentRaw = localStorage.getItem('recent-analyses') || '[]'
          const recent = JSON.parse(recentRaw) as unknown[]
          const entry = {
            id: `${Date.now()}`,
            url: normalizedUrl,
            name: scraped.name,
            icon: scraped.icon,
            source: scraped.source,
            createdAt: new Date().toISOString(),
          }
          const filtered = recent.filter((r) => {
            if (!r || typeof r !== 'object') return false
            return (r as { url?: unknown }).url !== normalizedUrl
          })
          filtered.unshift(entry)
          localStorage.setItem('recent-analyses', JSON.stringify(filtered.slice(0, 20)))
        } catch {
          // ignore
        }

        setStepStatus('scrape', 'complete')
        activateNextAfter('scrape')

        // 2) Generate plan
        const stepAdvance = window.setInterval(() => {
          // While generating, keep the UI feeling alive by advancing through the middle steps.
          setSteps((prev) => {
            const idx = prev.findIndex((s) => s.status === 'active')
            if (idx === -1) return prev
            if (prev[idx].id === 'final') return prev

            const nextIdx = idx + 1
            return prev.map((s, i) => {
              if (i < idx) return s
              if (i === idx) return { ...s, status: 'complete' }
              if (i === nextIdx && s.status === 'pending') return { ...s, status: 'active' }
              return s
            })
          })
        }, 6500)

        try {
          const planRes = await fetch('/api/generate-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scraped }),
            signal: abortRef.current?.signal,
          })
          const plan = (await planRes.json()) as PlanResult
          if (!planRes.ok) throw new Error(getErrorMessage(plan, 'Generation failed'))

          if (!isMounted.current) return

          // Store plan for instant hydration on the plan pages (existing behavior)
          try {
            sessionStorage.setItem(`plan-${plan.id}`, JSON.stringify(plan))
          } catch {
            // ignore
          }

          // Mark everything complete
          setSteps((prev) => prev.map((s) => ({ ...s, status: 'complete' })))

          window.setTimeout(() => {
            onComplete(plan.id)
          }, 400)
        } finally {
          window.clearInterval(stepAdvance)
        }
      } catch (err) {
        // AbortController throws a DOMException named AbortError
        if (err instanceof DOMException && err.name === 'AbortError') {
          onError('Cancelled')
          return
        }

        const msg = err instanceof Error ? err.message : 'Failed to generate plan'

        // Mark whatever step is currently active as error
        setSteps((prev) =>
          prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s))
        )

        onError(msg)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f]" role="dialog" aria-modal="true" aria-label="Generating plan">
      <div className="h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-xl">
          <div className="text-center">
            <div className="text-xs text-slate-500">Processing</div>
            <div className="mt-1 text-sm text-slate-300 font-mono" title={url}>
              {truncateMiddle(url, 64)}
            </div>

            {(appName || appIcon) && (
              <div className="mt-6 flex items-center justify-center gap-3">
                {appIcon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={appIcon} alt={appName || 'App icon'} className="h-10 w-10 rounded-xl" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Circle className="h-5 w-5" />
                  </div>
                )}
                <div className="text-left min-w-0">
                  <div className="text-xs text-slate-500">App</div>
                  <div className="text-base font-semibold text-white truncate max-w-[20rem]">
                    {appName || 'Detected'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-slate-500">Progress</div>
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort()
                }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-4">
              {steps.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  {s.status === 'complete' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : s.status === 'active' ? (
                    <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                  ) : s.status === 'error' ? (
                    <Circle className="h-5 w-5 text-red-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-600" />
                  )}

                  <div className={
                    'text-sm ' +
                    (s.status === 'complete'
                      ? 'text-slate-200'
                      : s.status === 'active'
                        ? 'text-white'
                        : s.status === 'error'
                          ? 'text-red-300'
                          : 'text-slate-400')
                  }>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center text-sm text-slate-500">
              This usually takes 30–60 seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
