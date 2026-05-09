import { useAuth } from "@/hooks/useAuth";

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { isAdmin } = useAuth();
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-6 border-b border-coro-border bg-coro-bg/80 backdrop-blur-md">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-medium text-coro-text-primary">{title}</h1>
          {isAdmin && (
            <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-coro-gold-10 text-coro-gold">ADMIN</span>
          )}
        </div>
        {subtitle && <p className="text-xs text-coro-text-muted mt-0.5">{subtitle}</p>}
      </div>
    </header>
  );
}
