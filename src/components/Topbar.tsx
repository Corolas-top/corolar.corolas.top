import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { isAdmin } = useAuth();
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-6 border-b border-[rgba(255,255,255,0.06)] bg-[#050505]/80 backdrop-blur-md">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-medium text-[#f5f5f0]">{t(title)}</h1>
          {isAdmin && <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-[rgba(201,169,110,0.15)] text-[#c9a96e]">ADMIN</span>}
        </div>
        {subtitle && <p className="text-xs text-[rgba(245,245,240,0.35)] mt-0.5">{subtitle}</p>}
      </div>
    </header>
  );
}
