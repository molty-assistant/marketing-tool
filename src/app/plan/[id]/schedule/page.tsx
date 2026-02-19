'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

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

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 text-sm text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
          Schedule posts for auto-publishing across your connected platforms — set a date and time, then let the system handle generation and posting.
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">📅 Content Schedule</h1>
          <div className="flex gap-2">
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value as 'instagram' | 'tiktok')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="instagram">📸 Instagram</option>
              <option value="tiktok">🎵 TikTok</option>
            </select>
            <button
              onClick={() => { setAddDate(formatDate(weekDates[0])); setShowAddModal(true); }}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Post
            </button>
            <button
              onClick={handleAutoGenerate}
              disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {generating ? '⏳ Generating…' : '✨ Auto-generate Week'}
            </button>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setWeekOffset(w => w - 1)} className="text-slate-400 hover:text-white px-3 py-1">
            ← Prev
          </button>
          <span className="text-slate-300 font-medium">
            {dayLabel(weekDates[0])} — {dayLabel(weekDates[6])}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="text-slate-400 hover:text-white px-3 py-1">
            Next →
          </button>
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="text-center text-slate-400 py-20">Loading…</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map(date => {
              const items = getItemsForDate(date);
              const isToday = formatDate(date) === formatDate(new Date());
              return (
                <div
                  key={formatDate(date)}
                  className={`bg-slate-900 border rounded-xl p-3 min-h-[160px] ${
                    isToday ? 'border-indigo-500' : 'border-slate-800'
                  }`}
                >
                  <div className={`text-xs font-medium mb-2 ${isToday ? 'text-indigo-400' : 'text-slate-500'}`}>
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
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Scheduled Post</h3>
              <div className="space-y-4 text-sm">
                <div><span className="text-slate-400">Platform:</span> {PLATFORM_EMOJI[selectedItem.platform]} {selectedItem.platform}</div>
                <div><span className="text-slate-400">Type:</span> {selectedItem.content_type}</div>
                <div><span className="text-slate-400">Scheduled:</span> {selectedItem.scheduled_at}</div>
                <div><span className="text-slate-400">Topic:</span> {selectedItem.topic || '—'}</div>
                <div>
                  <span className="text-slate-400">Status:</span>{' '}
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
                  <button
                    onClick={() => handleCancel(selectedItem.id)}
                    className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel Post
                  </button>
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Add Scheduled Post</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Date</label>
                  <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Time</label>
                  <input type="time" value={addTime} onChange={e => setAddTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Platform</label>
                  <select value={addPlatform} onChange={e => setAddPlatform(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="instagram">📸 Instagram</option>
                    <option value="tiktok">🎵 TikTok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Content Type</label>
                  <select value={addType} onChange={e => setAddType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="post">Post</option>
                    <option value="reel">Reel</option>
                    <option value="story">Story</option>
                    <option value="carousel">Carousel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Topic (optional)</label>
                  <input type="text" value={addTopic} onChange={e => setAddTopic(e.target.value)}
                    placeholder="e.g. 5 tips for better productivity"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={handleAdd}
                  className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Add
                </button>
                <button onClick={() => setShowAddModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
