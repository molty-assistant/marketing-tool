'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import ErrorRetry from '@/components/ErrorRetry';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePlan } from '@/hooks/usePlan';
import { PageSkeleton } from '@/components/Skeleton';
import DismissableTip from '@/components/DismissableTip';

type ApprovalQueueStatus = 'pending' | 'approved' | 'rejected';

type ApprovalItem = {
  id: string;
  plan_id: string;
  section_type: string;
  section_label: string;
  content: string;
  status: ApprovalQueueStatus;
  edited_content: string | null;
  created_at: string;
  updated_at: string;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

function badgeClasses(status: ApprovalQueueStatus) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200';
    case 'rejected':
      return 'bg-red-500/15 border-red-500/30 text-red-200';
    case 'pending':
    default:
      return 'bg-amber-500/15 border-amber-500/30 text-amber-200';
  }
}

export default function ApprovalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();

  const { plan, loading: planLoading, error: planError, reload: loadPlan } = usePlan(id);

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState('');

  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState({
    sectionType: 'draft:professional',
    sectionLabel: 'app_store_description',
    content: '',
  });

  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = () => {
    setLoadingQueue(true);
    setQueueError('');
    fetch(`/api/approval-queue?planId=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load queue');
        return res.json();
      })
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
        setStats(data?.stats || { total: 0, pending: 0, approved: 0, rejected: 0 });
      })
      .catch((err) => setQueueError(err instanceof Error ? err.message : 'Failed to load queue'))
      .finally(() => setLoadingQueue(false));
  };

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sortedItems = useMemo(() => {
    const order: Record<ApprovalQueueStatus, number> = { pending: 0, rejected: 1, approved: 2 };
    return [...items].sort((a, b) => {
      const d = order[a.status] - order[b.status];
      if (d !== 0) return d;
      return (b.updated_at || '').localeCompare(a.updated_at || '');
    });
  }, [items]);

  const post = async (payload: object) => {
    const res = await fetch('/api/approval-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Request failed');
    return data;
  };

  const handleCreate = async () => {
    if (!newItem.content.trim()) {
      toastError('Please add some content');
      return;
    }

    setCreating(true);
    try {
      await post({
        action: 'add',
        planId: id,
        sectionType: newItem.sectionType,
        sectionLabel: newItem.sectionLabel,
        content: newItem.content,
      });
      setNewItem((p) => ({ ...p, content: '' }));
      toastSuccess('Added to queue');
      loadQueue();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to add item');
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (itemId: string, status: 'approved' | 'rejected') => {
    setBusyId(itemId);
    try {
      await post({ action: status === 'approved' ? 'approve' : 'reject', id: itemId });
      toastSuccess(status === 'approved' ? 'Approved' : 'Rejected');
      loadQueue();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveEdit = async (item: ApprovalItem) => {
    const value = editDraft[item.id] ?? (item.edited_content ?? item.content);
    setBusyId(item.id);
    try {
      await post({ action: 'update', id: item.id, editedContent: value });
      setEditing((p) => ({ ...p, [item.id]: false }));
      toastSuccess('Saved');
      loadQueue();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this item?')) return;
    setBusyId(itemId);
    try {
      await post({ action: 'delete', id: itemId });
      toastSuccess('Deleted');
      loadQueue();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setBusyId(null);
    }
  };

  if (planLoading) {
    return <PageSkeleton />;
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
        <div className="text-muted-foreground mb-4">Plan not found</div>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Start a new analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <DismissableTip id="approvals-tip">Review and approve AI-generated content before it goes live — edit any section inline or regenerate it before adding to your posting queue.</DismissableTip>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">✅ Approvals</h1>
          <p className="text-muted-foreground">Approve, reject, and edit content before export.</p>
        </div>
        <Button
          onClick={loadQueue}
          variant="secondary"
          className="h-auto px-4 py-2.5"
        >
          ↻ Refresh
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-semibold text-foreground mt-1">{stats.total}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground">Pending</div>
          <div className="text-2xl font-semibold text-amber-200 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground">Approved</div>
          <div className="text-2xl font-semibold text-emerald-200 mt-1">{stats.approved}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground">Rejected</div>
          <div className="text-2xl font-semibold text-red-200 mt-1">{stats.rejected}</div>
        </div>
      </div>

      {/* Create */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-semibold text-foreground">Add to approval queue</div>
            <div className="text-xs text-muted-foreground">Tip: use sectionType like draft:professional, draft:bold, translation:es, etc.</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <Label className="block text-xs text-muted-foreground mb-1">Section type</Label>
            <Input
              value={newItem.sectionType}
              onChange={(e) => setNewItem((p) => ({ ...p, sectionType: e.target.value }))}
              className="bg-muted/50 border-border text-muted-foreground focus-visible:ring-indigo-500/40"
            />
          </div>
          <div>
            <Label className="block text-xs text-muted-foreground mb-1">Section label</Label>
            <Input
              value={newItem.sectionLabel}
              onChange={(e) => setNewItem((p) => ({ ...p, sectionLabel: e.target.value }))}
              className="bg-muted/50 border-border text-muted-foreground focus-visible:ring-indigo-500/40"
            />
          </div>
        </div>

        <div className="mt-4">
          <Label className="block text-xs text-muted-foreground mb-1">Content</Label>
          <Textarea
            value={newItem.content}
            onChange={(e) => setNewItem((p) => ({ ...p, content: e.target.value }))}
            placeholder="Paste generated content here…"
            className="min-h-[110px] bg-muted/50 border-border p-3 text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-indigo-500/40"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="h-auto px-5 py-2.5 disabled:bg-indigo-600/50"
          >
            {creating ? 'Adding…' : '➕ Add'}
          </Button>
        </div>
      </div>

      {/* Queue */}
      {queueError && (
        <div className="mb-6">
          <ErrorRetry error={queueError} onRetry={loadQueue} />
        </div>
      )}

      {loadingQueue ? (
        <div className="text-muted-foreground">Loading queue…</div>
      ) : sortedItems.length === 0 ? (
        <div className="bg-muted/50 border border-border rounded-2xl p-8 text-center text-muted-foreground">
          No items yet. Add content above, then approve it for export.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedItems.map((item) => {
            const isEditing = !!editing[item.id];
            const displayValue = (item.edited_content ?? item.content) || '';
            const currentEditValue = editDraft[item.id] ?? displayValue;
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl overflow-hidden border bg-card border-border"
              >
                <div className="p-4 border-b border-border flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-foreground truncate">{item.section_label}</div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${badgeClasses(item.status)}`}
                      >
                        {item.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.section_type}</span>
                    </div>
                    {item.edited_content && (
                      <div className="text-xs text-muted-foreground mt-1">Edited version set</div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button
                      onClick={() => handleApprove(item.id, 'approved')}
                      disabled={isBusy}
                      variant="ghost"
                      size="sm"
                      className="h-auto bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-100 px-3 py-1.5 rounded-lg"
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      onClick={() => handleApprove(item.id, 'rejected')}
                      disabled={isBusy}
                      variant="ghost"
                      size="sm"
                      className="h-auto bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-100 px-3 py-1.5 rounded-lg"
                    >
                      ✕ Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setEditing((p) => ({ ...p, [item.id]: !p[item.id] }));
                        setEditDraft((p) => ({ ...p, [item.id]: displayValue }));
                      }}
                      disabled={isBusy}
                      variant="secondary"
                      size="sm"
                      className="h-auto text-muted-foreground px-3 py-1.5 rounded-lg"
                    >
                      {isEditing ? 'Close' : '✏️ Edit'}
                    </Button>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      disabled={isBusy}
                      variant="secondary"
                      size="sm"
                      className="h-auto text-muted-foreground px-3 py-1.5 rounded-lg"
                      title="Delete"
                    >
                      🗑
                    </Button>
                  </div>
                </div>

                <div className="p-4">
                  {isEditing ? (
                    <>
                      <Textarea
                        value={currentEditValue}
                        onChange={(e) => setEditDraft((p) => ({ ...p, [item.id]: e.target.value }))}
                        className="min-h-[140px] bg-muted/50 border-border p-3 text-muted-foreground focus-visible:ring-indigo-500/40"
                      />
                      <div className="flex justify-between items-center gap-3 mt-3 flex-wrap">
                        <Button
                          onClick={async () => {
                            await navigator.clipboard.writeText(currentEditValue);
                            toastSuccess('Copied');
                          }}
                          variant="secondary"
                          size="sm"
                          className="h-auto text-muted-foreground px-3 py-1.5 rounded-lg"
                        >
                          📋 Copy
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setEditing((p) => ({ ...p, [item.id]: false }));
                              setEditDraft((p) => ({ ...p, [item.id]: displayValue }));
                            }}
                            disabled={isBusy}
                            variant="secondary"
                            size="sm"
                            className="h-auto text-muted-foreground px-3 py-1.5 rounded-lg"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleSaveEdit(item)}
                            disabled={isBusy}
                            size="sm"
                            className="h-auto px-3 py-1.5 rounded-lg"
                          >
                            {isBusy ? 'Saving…' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {displayValue || <span className="text-muted-foreground">(Empty)</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground mt-10 mb-6">
        Export only includes approved items (plus brief/assets).
      </div>
    </div>
  );
}
