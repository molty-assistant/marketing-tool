/**
 * /marketing — redirect to the plan dashboard.
 *
 * This route was referenced in navigation and QA docs but never existed.
 * Minimal fix: hard-redirect to /dashboard so users land somewhere useful.
 */
import { redirect } from 'next/navigation';

export default function MarketingPage() {
  redirect('/dashboard');
}
