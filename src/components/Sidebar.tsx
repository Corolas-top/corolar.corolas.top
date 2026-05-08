import { useState } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Shield,
  Bot,
  PenTool,
  Lock,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/", label: "仪表盘", icon: LayoutDashboard },
  { path: "/projects", label: "项目管理", icon: FolderOpen },
  { path: "/users", label: "用户数据库", icon: Users },
  { path: "/oauth", label: "OAuth 配置", icon: Shield },
  { path: "/agent", label: "AI Agent", icon: Bot },
  { path: "/canvas", label: "画布", icon: PenTool },
  { path: "/notes", label: "加密笔记", icon: Lock },
];

export default function Sidebar() {
  const location = useLocation();
  const { logout, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col transition-all duration-200 z-50"
      style={{
        width: collapsed ? 64 : 240,
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 h-14 px-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="w-8 h-8 flex-shrink-0">
          <svg viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="var(--text-primary)" strokeWidth="1" fill="none" />
            <circle cx="16" cy="16" r="10" stroke="var(--text-primary)" strokeWidth="0.5" fill="none" />
            <text x="16" y="18" textAnchor="middle" fill="var(--text-primary)" fontSize="6" fontFamily="serif">C</text>
          </svg>
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
            Corolar
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          // Agent permission check
          if (!isAdmin && item.path === "/agent") return null;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 h-10 rounded-lg transition-all duration-150 relative group"
              style={{
                paddingLeft: collapsed ? 12 : 16,
                paddingRight: collapsed ? 12 : 16,
                background: isActive ? "rgba(201,169,110,0.1)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: "var(--text-gold)" }}
                />
              )}
              <Icon
                size={20}
                style={{ color: isActive ? "var(--text-gold)" : "var(--text-secondary)", flexShrink: 0 }}
              />
              {!collapsed && (
                <span
                  className="text-sm font-medium transition-colors duration-150"
                  style={{ color: isActive ? "var(--text-gold)" : "var(--text-secondary)" }}
                >
                  {item.label}
                </span>
              )}
              {collapsed && (
                <div
                  className="absolute left-full ml-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", zIndex: 100 }}
                >
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-2 mx-3 h-px" style={{ background: "var(--border-subtle)" }} />

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3 h-10 rounded-lg transition-all duration-150 w-full"
          style={{
            paddingLeft: collapsed ? 12 : 16,
            paddingRight: collapsed ? 12 : 16,
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut size={20} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          {!collapsed && (
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              退出登录
            </span>
          )}
        </button>
      </nav>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t transition-colors duration-150"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {collapsed ? <ChevronRight size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronLeft size={16} style={{ color: "var(--text-muted)" }} />}
      </button>
    </aside>
  );
}
