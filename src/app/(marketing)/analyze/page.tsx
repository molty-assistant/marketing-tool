'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import GenerationOverlay from '@/components/GenerationOverlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function normalizeUrl(input: string): string {
  return input.trim().match(/^https?:\/\//i) ? input.trim() : `https://${input.trim()}`
}

function isValidUrl(input: string) {
  try {    void new URL(normalizeUrl(input))
    return true
  } catch {
    return false
  }
}

function AnalyzeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialUrl = searchParams.get('url') || ''

  const [url, setUrl] = useState(initialUrl)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(!!initialUrl)
  const [generatingUrl, setGeneratingUrl] = useState(initialUrl)


  const start = () => {
    setError('')
    if (!url.trim()) {
      setError('Paste a URL to generate your plan.')
      return
    }

    const normalized = normalizeUrl(url)
    if (!isValidUrl(normalized)) {
      setError('Please enter a valid URL')
      return
    }

    setGeneratingUrl(normalized)
    setGenerating(true)
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      {generating && (
        <GenerationOverlay
          url={generatingUrl}
          onComplete={(planId) => router.push(`/plan/${planId}`)}
          onError={(err) => {
            setGenerating(false)
            setError(err)
          }}
        />
      )}

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Generate a marketing plan</h1>
        <p className="mt-2 text-sm text-slate-400">
          Paste a URL and we&apos;ll generate a complete plan.
        </p>

        <div className="mt-6">
          <Label htmlFor="analyze-url" className="block mb-2">
            URL
          </Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="analyze-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && start()}
              placeholder="https://linear.app (or App Store / Play Store link)"
              className="sm:flex-1 h-auto bg-slate-950 px-4 py-3 focus-visible:border-transparent"
            />
            <Button
              onClick={start}
              className="w-full sm:w-auto h-auto font-semibold px-6 py-3 whitespace-nowrap"
            >
              Generate plan →
            </Button>
          </div>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto text-center py-20">
          <div className="text-lg text-slate-300">Loading...</div>
        </div>
      }
    >
      <AnalyzeContent />
    </Suspense>
  )
}
