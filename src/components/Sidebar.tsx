import { useState } from "react";
import { Link, useLocation } from "react-router";
import { LayoutDashboard, FolderOpen, Users, Shield, Bot, PenTool, Lock, LogOut, Globe, ChevronRight, Database, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";

const navItems = [
  { path: "/", label: "nav.dashboard", icon: LayoutDashboard },
  { path: "/projects", label: "nav.projects", icon: FolderOpen },
  { path: "/users", label: "nav.users", icon: Users },
  { path: "/databases", label: "nav.databases", icon: Database },
  { path: "/oauth", label: "nav.oauth", icon: Shield },
  { path: "/agent", label: "nav.agent", icon: Bot },
  { path: "/canvas", label: "nav.canvas", icon: PenTool },
  { path: "/notes", label: "nav.notes", icon: Lock },
  { path: "/status", label: "nav.status", icon: Activity },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const loc = useLocation();
  const { logout, isAdmin } = useAuth();
  const { lang, setLang, t } = useLang();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        h-screen flex flex-col bg-[#0a0a0a] border-r border-white/[0.06] z-50
        transition-all duration-300
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      <div className="flex items-center gap-3 h-14 px-5 border-b border-white/[0.06] shrink-0">
        <img src="/logo.png" alt="Corolas" className="w-8 h-8 object-contain" />
        <span className={`text-sm font-semibold tracking-wide text-[#f5f5f0] transition-opacity ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>Corolar</span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden lg:flex p-1 text-white/30 hover:text-white/60 transition-colors"
        >
          <ChevronRight size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = loc.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path}
              onClick={() => onClose?.()}
              className={`flex items-center gap-3 h-10 px-3 rounded-lg transition-all text-sm relative ${collapsed ? 'justify-center px-2' : ''} ${active ? "bg-[rgba(201,169,110,0.1)] text-[#c9a96e]" : "text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.04)]"}`}
              title={collapsed ? t(item.label) : undefined}
            >
              {active && !collapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#c9a96e] rounded-r" />}
              <Icon size={18} />
              <span className={`font-medium transition-opacity ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{t(item.label)}</span>
            </Link>
          );
        })}
        <div className="h-px mx-3 my-2 bg-white/[0.06]" />
        <button onClick={logout} className={`flex items-center gap-3 h-10 px-3 rounded-lg text-sm text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all w-full ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? t("nav.logout") : undefined}
        >
          <LogOut size={18} />
          <span className={`font-medium transition-opacity ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{t("nav.logout")}</span>
        </button>
      </nav>

      <div className="px-5 py-3 border-t border-white/[0.06] space-y-2 shrink-0">
        <button onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className={`flex items-center gap-2 w-full h-8 px-3 rounded-lg text-xs text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.04)] transition-all ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? t("nav.lang") : undefined}
        >
          <Globe size={14} />
          <span className={`transition-opacity ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{t("nav.lang")}: {lang === "zh" ? "中文" : "English"}</span>
        </button>
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-[#111] text-[#c9a96e] border border-[rgba(201,169,110,0.3)]">
            {isAdmin ? "A" : "?"}
          </div>
          <div className={`transition-opacity ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            <p className="text-xs font-medium text-[#f5f5f0]">{isAdmin ? "Administrator" : "Guest"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
