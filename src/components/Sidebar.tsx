import { Link, useLocation } from "react-router";
import { LayoutDashboard, FolderOpen, Users, Shield, Bot, PenTool, Lock, LogOut, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";

const navItems = [
  { path: "/", label: "nav.dashboard", icon: LayoutDashboard },
  { path: "/projects", label: "nav.projects", icon: FolderOpen },
  { path: "/users", label: "nav.users", icon: Users },
  { path: "/oauth", label: "nav.oauth", icon: Shield },
  { path: "/agent", label: "nav.agent", icon: Bot },
  { path: "/canvas", label: "nav.canvas", icon: PenTool },
  { path: "/notes", label: "nav.notes", icon: Lock },
];

export default function Sidebar() {
  const loc = useLocation();
  const { logout, isAdmin } = useAuth();
  const { lang, setLang, t } = useLang();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col bg-[#0a0a0a] border-r border-[rgba(255,255,255,0.06)] z-50">
      <div className="flex items-center gap-3 h-14 px-5 border-b border-[rgba(255,255,255,0.06)]">
        <img src="/logo.png" alt="Corolas" className="w-8 h-8 object-contain" />
        <span className="text-sm font-semibold tracking-wide text-[#f5f5f0]">Corolar</span>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = loc.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 h-10 px-4 rounded-lg transition-all text-sm relative ${active ? "bg-[rgba(201,169,110,0.1)] text-[#c9a96e]" : "text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.04)]"}`}>
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#c9a96e] rounded-r" />}
              <Icon size={18} />
              <span className="font-medium">{t(item.label)}</span>
            </Link>
          );
        })}
        <div className="h-px mx-3 my-2 bg-[rgba(255,255,255,0.06)]" />
        <button onClick={logout} className="flex items-center gap-3 h-10 px-4 rounded-lg text-sm text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all w-full">
          <LogOut size={18} />
          <span className="font-medium">{t("nav.logout")}</span>
        </button>
      </nav>

      <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)] space-y-2">
        {/* Language toggle */}
        <button onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className="flex items-center gap-2 w-full h-8 px-3 rounded-lg text-xs text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all">
          <Globe size={14} />
          <span>{t("nav.lang")}: {lang === "zh" ? "中文" : "English"}</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-[#111] text-[#c9a96e] border border-[rgba(201,169,110,0.3)]">
            {isAdmin ? "A" : "?"}
          </div>
          <div>
            <p className="text-xs font-medium text-[#f5f5f0]">{isAdmin ? "Administrator" : "Guest"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
