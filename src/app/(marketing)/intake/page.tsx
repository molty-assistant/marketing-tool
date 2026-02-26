import Link from 'next/link';
import { Button } from '@/components/ui/button';

const intakeSubject = '£99 Launch Pack Intake — [Product Name]';
const intakeTemplate = `Hi Molty Chief,

I've paid for the £99 Launch Pack. Here are my details:

1) URL:
2) Product name:
3) Target customer:
4) Deadline:
5) Competitor 1:
6) Competitor 2:
7) Competitor 3:
8) Tone:
9) One-sentence outcome:

Anything else we should know:
`;

const intakeMailto = `mailto:moltychief@agentmail.to?subject=${encodeURIComponent(intakeSubject)}&body=${encodeURIComponent(intakeTemplate)}`;

export default function IntakePage() {
  return (
    <div className="w-full">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-[#0d1117]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-slate-700 dark:text-slate-300">
            Step 2 after payment
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Send your Launch Pack intake
          </h1>
          <p className="mt-4 text-base text-slate-600 sm:text-lg dark:text-slate-300">
            Send the details below to <span className="font-semibold">moltychief@agentmail.to</span> so we can start your £99 Launch Pack.
          </p>

          <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700/60 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">What to send</h2>
            <ul className="mt-4 grid gap-2 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
              <li>1. URL</li>
              <li>2. Product name</li>
              <li>3. Target customer</li>
              <li>4. Deadline</li>
              <li>5. Three competitors</li>
              <li>6. Tone</li>
              <li>7. One-sentence outcome</li>
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild className="h-auto bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500">
                <a href={intakeMailto}>Email my details</a>
              </Button>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:bg-slate-800/50"
              >
                Back to launch page
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-5 sm:p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Prefer not to use mailto?</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Copy this block into any email client and send it to <span className="font-semibold">moltychief@agentmail.to</span>.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {intakeTemplate}
          </pre>
        </div>
      </section>
    </div>
  );
}
