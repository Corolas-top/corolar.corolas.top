import { Search, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { isAdmin } = useAuth();

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between h-14 px-6"
      style={{
        background: "rgba(5,5,5,0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
            {title}
          </h1>
          {isAdmin && (
            <span
              className="px-1.5 py-0.5 text-[10px] rounded font-medium"
              style={{ background: "rgba(201,169,110,0.15)", color: "var(--text-gold)" }}
            >
              ADMIN
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Search size={18} />
        </button>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 relative"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Bell size={18} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "var(--error)" }}
          />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
          style={{ background: "var(--bg-elevated)", color: "var(--text-gold)", border: "1px solid var(--border-gold)" }}
        >
          {isAdmin ? "A" : "G"}
        </div>
      </div>
    </header>
  );
}
