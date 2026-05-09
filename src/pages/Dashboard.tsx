import { Globe, Users, Eye, Activity } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const stats = [
  { key: "projects", label: "项目总数", icon: Globe, color: "#c9a96e" },
  { key: "users", label: "注册用户", icon: Users, color: "#60a5fa" },
  { key: "visits", label: "今日访问", icon: Eye, color: "#4ade80" },
  { key: "status", label: "系统状态", icon: Activity, color: "#4ade80" },
];

export default function Dashboard() {
  const { data: st } = trpc.dashboard.stats.useQuery();
  const { data: trend } = trpc.dashboard.visitTrend.useQuery({ days: 7 });

  const values: Record<string, string | number> = {
    projects: st?.projectCount ?? "-",
    users: st?.userCount ?? "-",
    visits: "342",
    status: "正常",
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="仪表盘" subtitle="Dashboard Overview" />
      <div className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-4xl font-light text-coro-text-primary tracking-tight">仪表盘</h1>
          <p className="text-xs mt-1 tracking-wide text-coro-text-muted">Dashboard Overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={c.key} className="rounded-xl p-5 bg-coro-card border border-coro-border animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.color}1a` }}>
                    <Icon size={20} style={{ color: c.color }} />
                  </div>
                  <span className="text-xs font-medium text-coro-text-secondary">{c.label}</span>
                </div>
                <div className="text-2xl font-semibold text-coro-text-primary font-mono">{values[c.key]}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 rounded-xl p-5 bg-coro-card border border-coro-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-coro-text-primary">访问趋势</h3>
              <div className="flex gap-1">
                {["今日","7天","30天"].map(l => (
                  <button key={l} className={`px-3 py-1 rounded-md text-xs ${l === "7天" ? "bg-coro-gold-10 text-coro-gold" : "text-coro-text-muted"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend ?? []}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c9a96e" stopOpacity={0.3} /><stop offset="95%" stopColor="#c9a96e" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(245,245,240,0.35)", fontSize: 12 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fill: "rgba(245,245,240,0.35)", fontSize: 12 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(201,169,110,0.3)", borderRadius: 8, color: "#f5f5f0", fontSize: 13 }} />
                  <Area type="monotone" dataKey="count" stroke="#c9a96e" strokeWidth={2} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl p-5 bg-coro-card border border-coro-border">
            <h3 className="text-sm font-medium text-coro-text-primary mb-4">最近活动</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {(st?.recentActivity ?? []).map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-coro-info" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-coro-text-primary truncate">{a.action} {a.target_type}</p>
                    <p className="text-xs text-coro-text-muted">{a.actor_type}</p>
                  </div>
                  <span className="text-xs text-coro-text-muted flex-shrink-0">
                    {a.created_at ? new Date(a.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              ))}
              {(!st?.recentActivity || st.recentActivity.length === 0) && (
                <p className="text-sm text-center py-8 text-coro-text-muted">暂无活动记录</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden bg-coro-card border border-coro-border">
          <div className="px-5 py-4 border-b border-coro-border"><h3 className="text-sm font-medium text-coro-text-primary">项目状态</h3></div>
          <ProjectStatusTable />
        </div>
      </div>
    </div>
  );
}

function ProjectStatusTable() {
  const { data: projects } = trpc.projects.list.useQuery();
  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "rgba(74,222,128,0.1)", text: "#4ade80", label: "运行中" },
    maintenance: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", label: "维护中" },
    development: { bg: "rgba(96,165,250,0.1)", text: "#60a5fa", label: "开发中" },
    offline: { bg: "rgba(248,113,113,0.1)", text: "#f87171", label: "已下线" },
  };
  return (
    <table className="w-full">
      <thead><tr className="bg-coro-elevated">
        {["项目名称","URL","状态","最后更新","操作"].map(h => (
          <th key={h} className="text-left px-5 py-3 text-xs font-medium text-coro-text-secondary">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {(projects ?? []).map(p => {
          const s = statusMap[p.status] || statusMap.offline;
          return (
            <tr key={p.id} className="data-table-row border-b border-coro-border hover:bg-white/[0.03] transition-colors">
              <td className="px-5 py-3 text-sm font-medium text-coro-text-primary">{p.name}</td>
              <td className="px-5 py-3 text-sm text-coro-gold font-mono">{p.url}</td>
              <td className="px-5 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.text }}>{s.label}</span></td>
              <td className="px-5 py-3 text-xs text-coro-text-muted">{p.updated_at ? new Date(p.updated_at).toLocaleDateString("zh-CN") : "-"}</td>
              <td className="px-5 py-3"><a href={`https://${p.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-coro-text-muted hover:text-coro-gold transition-colors">访问 &rarr;</a></td>
            </tr>
          );
        })}
        {(!projects || projects.length === 0) && (
          <tr><td colSpan={5} className="text-center py-12 text-sm text-coro-text-muted">暂无项目数据</td></tr>
        )}
      </tbody>
    </table>
  );
}
