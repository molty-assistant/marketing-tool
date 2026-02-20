'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface ScheduleItem {
  id: string;
  plan_id: string;
  platform: string;
  content_type: string;
  topic: string | null;
  scheduled_at: string;
  status: string;
  post_id: string | null;
  error: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  generating: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  posted: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
};

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() + 1 + offset * 7); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function SchedulePage() {
  const params = useParams();
  const planId = params.id as string;

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');

  // Add form state
  const [addDate, setAddDate] = useState('');
  const [addTime, setAddTime] = useState('12:00');
  const [addPlatform, setAddPlatform] = useState('instagram');
  const [addType, setAddType] = useState('post');
  const [addTopic, setAddTopic] = useState('');

  const weekDates = getWeekDates(weekOffset);
  const from = formatDate(weekDates[0]);
  const to = formatDate(weekDates[6]) + ' 23:59:59';

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-schedule?planId=${planId}&from=${from}&to=${to}`);
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [planId, from, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSchedules();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchSchedules]);

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const res = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, platform, startDate, days: 7 }),
      });
      if (res.ok) {
        await fetchSchedules();
      }
    } catch { /* ignore */ }
    setGenerating(false);
  };

  const handleAdd = async () => {
    if (!addDate) return;
    const scheduledAt = `${addDate} ${addTime}:00`;
    await fetch('/api/content-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        platform: addPlatform,
        contentType: addType,
        topic: addTopic || undefined,
        scheduledAt,
      }),
    });
    setShowAddModal(false);
    setAddTopic('');
    fetchSchedules();
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/content-schedule?id=${id}`, { method: 'DELETE' });
    setSelectedItem(null);
    fetchSchedules();
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return schedules.filter(s => s.scheduled_at.startsWith(dateStr));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <div className="mb-8 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300">
          Schedule posts for auto-publishing across your connected platforms — set a date and time, then let the system handle generation and posting.
      </div>

      <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Content Schedule</h1>
          <div className="flex gap-2">
            <Select
              value={platform}
              onChange={e => setPlatform(e.target.value as 'instagram' | 'tiktok')}
              className="h-auto w-auto rounded-lg border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="instagram">📸 Instagram</option>
              <option value="tiktok">🎵 TikTok</option>
            </Select>
            <Button
              onClick={() => { setAddDate(formatDate(weekDates[0])); setShowAddModal(true); }}
              variant="secondary"
              className="h-auto px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Add Post
            </Button>
            <Button
              onClick={handleAutoGenerate}
              disabled={generating}
              className="h-auto px-4 py-2 rounded-lg text-sm font-medium"
            >
              {generating ? '⏳ Generating…' : '✨ Auto-generate Week'}
            </Button>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={() => setWeekOffset(w => w - 1)}
            variant="ghost"
            size="sm"
            className="h-auto px-3 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            ← Prev
          </Button>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {dayLabel(weekDates[0])} — {dayLabel(weekDates[6])}
          </span>
          <Button
            onClick={() => setWeekOffset(w => w + 1)}
            variant="ghost"
            size="sm"
            className="h-auto px-3 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Next →
          </Button>
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 dark:text-slate-400">Loading…</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map(date => {
              const items = getItemsForDate(date);
              const isToday = formatDate(date) === formatDate(new Date());
              return (
                <div
                  key={formatDate(date)}
                  className={`min-h-[160px] rounded-xl border p-3 ${
                    isToday
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className={`mb-2 text-xs font-medium ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                    {dayLabel(date)}
                  </div>
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`w-full text-left p-2 rounded-lg border text-xs transition-colors hover:brightness-110 ${
                          STATUS_COLORS[item.status] || STATUS_COLORS.scheduled
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span>{PLATFORM_EMOJI[item.platform] || '📱'}</span>
                          <span className="font-medium">{formatTime(item.scheduled_at)}</span>
                        </div>
                        <div className="truncate text-[11px] opacity-80">
                          {item.topic || item.content_type}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedItem(null)}>
            <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Scheduled Post</h3>
              <div className="space-y-4 text-sm">
                <div className="text-slate-700 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">Platform:</span> {PLATFORM_EMOJI[selectedItem.platform]} {selectedItem.platform}</div>
                <div className="text-slate-700 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">Type:</span> {selectedItem.content_type}</div>
                <div className="text-slate-700 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">Scheduled:</span> {selectedItem.scheduled_at}</div>
                <div className="text-slate-700 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">Topic:</span> {selectedItem.topic || '—'}</div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Status:</span>{' '}
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[selectedItem.status]}`}>
                    {selectedItem.status}
                  </span>
                </div>
                {selectedItem.error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs">
                    {selectedItem.error}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                {selectedItem.status === 'scheduled' && (
                  <Button
                    onClick={() => handleCancel(selectedItem.id)}
                    variant="destructive"
                    className="h-auto px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Cancel Post
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedItem(null)}
                  variant="secondary"
                  className="h-auto px-4 py-2 rounded-lg text-sm font-medium ml-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
            <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Add Scheduled Post</h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Date</Label>
                  <Input
                    type="date"
                    value={addDate}
                    onChange={e => setAddDate(e.target.value)}
                    className="rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Time</Label>
                  <Input
                    type="time"
                    value={addTime}
                    onChange={e => setAddTime(e.target.value)}
                    className="rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Platform</Label>
                  <Select
                    value={addPlatform}
                    onChange={e => setAddPlatform(e.target.value)}
                    className="rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="instagram">📸 Instagram</option>
                    <option value="tiktok">🎵 TikTok</option>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Content Type</Label>
                  <Select
                    value={addType}
                    onChange={e => setAddType(e.target.value)}
                    className="rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="post">Post</option>
                    <option value="reel">Reel</option>
                    <option value="story">Story</option>
                    <option value="carousel">Carousel</option>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-sm text-slate-500 dark:text-slate-400">Topic (optional)</Label>
                  <Input type="text" value={addTopic} onChange={e => setAddTopic(e.target.value)}
                    placeholder="e.g. 5 tips for better productivity"
                    className="rounded-lg border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-800" />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAdd}
                  className="h-auto px-4 py-2 rounded-lg text-sm font-medium">
                  Add
                </Button>
                <Button onClick={() => setShowAddModal(false)}
                  variant="secondary"
                  className="h-auto px-4 py-2 rounded-lg text-sm font-medium">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
