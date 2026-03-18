'use client';

import { useState } from 'react';
import { FileText, MessageSquare, Mail, Calendar } from 'lucide-react';

const TABS = [
  {
    id: 'brief',
    label: 'Marketing Brief',
    icon: FileText,
    pro: false,
    content: {
      title: 'Positioning Snapshot — LightScout AI',
      sections: [
        {
          heading: 'One-liner',
          body: 'LightScout AI helps photographers find the perfect shooting location using AI-powered scene analysis and golden hour predictions.',
        },
        {
          heading: 'Target audience',
          body: 'Professional and semi-professional photographers aged 25-45 who shoot outdoor portraits, landscapes, and real estate. They spend 2-4 hours per week scouting locations and value efficiency over price.',
        },
        {
          heading: 'Key differentiator',
          body: 'Unlike Google Maps or Instagram location tags, LightScout predicts lighting conditions and crowd density at any time of day — so photographers can plan shoots with confidence instead of guessing.',
        },
        {
          heading: 'Competitor angles',
          body: 'Say this: "Plan your shoot, not just your location." Not this: "We use AI" (everyone says this). Position against: manual scouting (slow), Instagram hashtags (unreliable), weather apps (no scene context).',
        },
      ],
    },
  },
  {
    id: 'social',
    label: 'Social Posts',
    icon: MessageSquare,
    pro: false,
    content: {
      title: 'Launch Posts — Ready to Copy',
      posts: [
        {
          platform: 'X / Twitter',
          text: 'I used to spend hours driving around looking for the perfect photo spot.\n\nNow I open LightScout, check the golden hour prediction, and show up ready to shoot.\n\nBuilt this because I was tired of guessing. If you shoot outdoors, this is for you.\n\nlightscout.ai',
        },
        {
          platform: 'LinkedIn',
          text: 'After 6 months of building in nights and weekends, LightScout AI is live.\n\nThe problem: photographers waste hours scouting locations, only to arrive at the wrong time with bad lighting.\n\nThe solution: AI-powered location analysis with real-time lighting predictions.\n\nEarly feedback has been incredible — 3 photographers told me it saved them 4+ hours last week alone.\n\nCheck it out → lightscout.ai',
        },
        {
          platform: 'X / Twitter',
          text: 'Hot take: 90% of photo location "guides" are useless because they don\'t tell you WHEN to go.\n\nThat\'s why we built golden hour + crowd predictions into LightScout.\n\nTiming > location. Always.',
        },
      ],
    },
  },
  {
    id: 'emails',
    label: 'Email Sequence',
    icon: Mail,
    pro: true,
    content: {
      title: 'Launch Email Sequence (3 emails)',
      emails: [
        {
          subject: 'Your scouting trips just got 4 hours shorter',
          subjectB: 'A/B: Stop guessing where to shoot',
          preview: 'Hi [Name],\n\nI built LightScout because I was tired of driving 45 minutes to a location, only to find harsh shadows and a packed parking lot.\n\nLightScout uses AI to predict lighting conditions, crowd levels, and scene composition — for any location, at any time of day...',
        },
        {
          subject: 'What 3 photographers said after their first week',
          subjectB: 'A/B: "I saved 4 hours last week"',
          preview: 'The best feedback isn\'t "cool app" — it\'s "I actually changed how I plan shoots."\n\nHere\'s what early users are saying...',
        },
        {
          subject: 'The one feature photographers keep asking about',
          subjectB: 'A/B: Golden hour predictions — here\'s how they work',
          preview: 'Most people sign up for location scouting. But the feature they come back for? Golden hour predictions.\n\nHere\'s why it matters for your next outdoor shoot...',
        },
      ],
    },
  },
  {
    id: 'calendar',
    label: '30-Day Calendar',
    icon: Calendar,
    pro: true,
    content: {
      title: '30-Day Content Calendar',
      weeks: [
        {
          label: 'Week 1 — Launch',
          posts: [
            { day: 'Mon', type: 'X', topic: 'Launch announcement thread' },
            { day: 'Tue', type: 'LinkedIn', topic: 'Founder story: why I built this' },
            { day: 'Wed', type: 'X', topic: 'Product demo GIF + one-liner' },
            { day: 'Thu', type: 'Instagram', topic: 'Before/after location scouting' },
            { day: 'Fri', type: 'X', topic: 'Hot take: timing > location' },
          ],
        },
        {
          label: 'Week 2 — Social proof',
          posts: [
            { day: 'Mon', type: 'X', topic: 'User testimonial + screenshot' },
            { day: 'Wed', type: 'LinkedIn', topic: 'Early metrics and lessons' },
            { day: 'Fri', type: 'X', topic: 'Feature spotlight: golden hour' },
          ],
        },
        {
          label: 'Week 3 — Education',
          posts: [
            { day: 'Mon', type: 'X', topic: '5 location scouting mistakes thread' },
            { day: 'Wed', type: 'LinkedIn', topic: 'How AI changes outdoor photography' },
            { day: 'Fri', type: 'Instagram', topic: 'Tips carousel: plan your shoot' },
          ],
        },
        {
          label: 'Week 4 — Momentum',
          posts: [
            { day: 'Mon', type: 'X', topic: 'Milestone update + user count' },
            { day: 'Wed', type: 'X', topic: 'Roadmap preview + request for feedback' },
            { day: 'Fri', type: 'LinkedIn', topic: 'Month 1 retrospective' },
          ],
        },
      ],
    },
  },
] as const;

export function ExampleShowcase() {
  const [activeTab, setActiveTab] = useState('brief');
  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-border bg-muted/50">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-indigo-500 text-foreground bg-card'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.pro && (
                <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-500">
                  PRO
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-5 sm:p-6">
        {tab.id === 'brief' && 'sections' in tab.content && (
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">{tab.content.title}</h3>
            <div className="space-y-4">
              {tab.content.sections.map((s) => (
                <div key={s.heading}>
                  <h4 className="text-sm font-semibold text-foreground mb-1">{s.heading}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab.id === 'social' && 'posts' in tab.content && (
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">{tab.content.title}</h3>
            <div className="space-y-4">
              {tab.content.posts.map((p, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
                  <span className="inline-block rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-500 mb-2">
                    {p.platform}
                  </span>
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {p.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab.id === 'emails' && 'emails' in tab.content && (
          <div>
            <h3 className="text-lg font-bold text-foreground mb-1">{tab.content.title}</h3>
            <p className="text-xs text-muted-foreground mb-4">Included in Pro — with A/B subject lines</p>
            <div className="space-y-4">
              {tab.content.emails.map((em, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-foreground">Subject: {em.subject}</p>
                    <p className="text-xs text-muted-foreground">{em.subjectB}</p>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {em.preview}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab.id === 'calendar' && 'weeks' in tab.content && (
          <div>
            <h3 className="text-lg font-bold text-foreground mb-1">{tab.content.title}</h3>
            <p className="text-xs text-muted-foreground mb-4">Included in Pro — 30 days of content planned out</p>
            <div className="space-y-5">
              {tab.content.weeks.map((w) => (
                <div key={w.label}>
                  <h4 className="text-sm font-semibold text-foreground mb-2">{w.label}</h4>
                  <div className="space-y-1.5">
                    {w.posts.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="w-8 text-xs font-medium text-muted-foreground">{p.day}</span>
                        <span className="inline-block w-16 rounded bg-indigo-500/10 px-1.5 py-0.5 text-center text-[10px] font-medium text-indigo-500">
                          {p.type}
                        </span>
                        <span className="text-muted-foreground">{p.topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
