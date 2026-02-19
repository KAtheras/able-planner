"use client";

type TopNavProps = {
  title?: string;
  tagline?: string;
  rightSlot?: React.ReactNode;
  settingsSlot?: React.ReactNode;
};

export default function TopNav({
  title = "ABLE Planner",
  tagline = "Mobile-first • Accessible • Bilingual",
  rightSlot,
  settingsSlot,
}: TopNavProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/80 md:sticky">
      <div className="mx-auto flex h-24 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            <span className="text-xs font-semibold tracking-wide">ABLE</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {tagline}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rightSlot}
          {settingsSlot}
        </div>
      </div>
    </header>
  );
}
