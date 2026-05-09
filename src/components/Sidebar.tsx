import { Link, useLocation } from "react-router";
import { LayoutDashboard, FolderOpen, Users, Shield, Bot, PenTool, Lock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const nav = [
  { path: "/", label: "仪表盘", icon: LayoutDashboard },
  { path: "/projects", label: "项目管理", icon: FolderOpen },
  { path: "/users", label: "用户数据库", icon: Users },
  { path: "/oauth", label: "OAuth 配置", icon: Shield },
  { path: "/agent", label: "AI Agent", icon: Bot },
  { path: "/canvas", label: "画布", icon: PenTool },
  { path: "/notes", label: "加密笔记", icon: Lock },
];

export default function Sidebar() {
  const loc = useLocation();
  const { logout, isAdmin } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col bg-coro-card border-r border-coro-border z-50">
      <div className="flex items-center gap-3 h-14 px-5 border-b border-coro-border">
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <circle cx="16" cy="16" r="13" stroke="#f5f5f0" strokeWidth="1" />
          <text x="16" y="20" textAnchor="middle" fill="#f5f5f0" fontSize="10" fontFamily="serif">C</text>
        </svg>
        <span className="text-sm font-semibold tracking-wide text-coro-text-primary">Corolar</span>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = loc.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 h-10 px-4 rounded-lg transition-all text-sm relative ${active ? "bg-coro-gold-10 text-coro-gold" : "text-coro-text-secondary hover:bg-white/[0.04]"}`}
            >
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-coro-gold rounded-r" />}
              <Icon size={18} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
        <div className="h-px mx-3 my-2 bg-coro-border" />
        <button onClick={logout} className="flex items-center gap-3 h-10 px-4 rounded-lg text-sm text-coro-text-secondary hover:bg-white/[0.04] transition-all w-full">
          <LogOut size={18} />
          <span className="font-medium">退出登录</span>
        </button>
      </nav>

      <div className="px-5 py-3 border-t border-coro-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-coro-elevated text-coro-gold border border-coro-gold-30">
            {isAdmin ? "A" : "G"}
          </div>
          <div>
            <p className="text-xs font-medium text-coro-text-primary">{isAdmin ? "Administrator" : "AI Agent"}</p>
            <p className="text-[10px] text-coro-text-muted">{isAdmin ? "管理员" : "代理"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
