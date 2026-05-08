import { Globe, Users, Eye, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const statCards = [
  { key: "projects", label: "项目总数", icon: Globe, color: "var(--text-gold)" },
  { key: "users", label: "注册用户", icon: Users, color: "var(--info)" },
  { key: "visits", label: "今日访问", icon: Eye, color: "var(--success)" },
  { key: "status", label: "系统状态", icon: Activity, color: "var(--success)" },
];

export default function Dashboard() {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: trend } = trpc.dashboard.visitTrend.useQuery({ days: 7 });

  const statValues: Record<string, string | number> = {
    projects: stats?.projectCount ?? "-",
    users: stats?.userCount ?? "-",
    visits: stats?.todayVisits ?? "-",
    status: stats?.systemStatus === "normal" ? "正常运行" : "异常",
  };

  const trendData = trend || [];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="仪表盘" subtitle="Dashboard Overview" />

      <div className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-4xl font-light tracking-tight" style={{ color: "var(--text-primary)" }}>
            仪表盘
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "var(--text-muted)" }}>
            Dashboard Overview
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className="rounded-xl p-5 animate-fade-in-up"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  animationDelay: `${i * 50}ms`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(201,169,110,0.1)" }}
                  >
                    <Icon size={20} style={{ color: card.color }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {card.label}
                  </span>
                </div>
                <div
                  className="text-2xl font-semibold"
                  style={{ color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {statValues[card.key]}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {i < 2 ? (
                    <TrendingUp size={14} style={{ color: "var(--success)" }} />
                  ) : (
                    <TrendingDown size={14} style={{ color: "var(--text-muted)" }} />
                  )}
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {i === 0 ? "4 个活跃项目" : i === 1 ? "本月新增 23" : i === 2 ? "实时数据" : "所有系统正常"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Visit Trend Chart */}
          <div
            className="lg:col-span-2 rounded-xl p-5 animate-fade-in-up"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                访问趋势
              </h3>
              <div className="flex gap-1">
                {["今日", "7天", "30天"].map((label) => (
                  <button
                    key={label}
                    className="px-3 py-1 rounded-md text-xs transition-all duration-150"
                    style={{
                      background: label === "7天" ? "rgba(201,169,110,0.15)" : "transparent",
                      color: label === "7天" ? "var(--text-gold)" : "var(--text-muted)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#c9a96e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(245,245,240,0.35)", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickFormatter={(val: string) => val.slice(5)}
                  />
                  <YAxis
                    tick={{ fill: "rgba(245,245,240,0.35)", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-gold)",
                      borderRadius: 8,
                      color: "var(--text-primary)",
                      fontSize: 13,
                    }}
                    labelStyle={{ color: "var(--text-secondary)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#c9a96e"
                    strokeWidth={2}
                    fill="url(#goldGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-xl p-5 animate-fade-in-up"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              animationDelay: "100ms",
            }}
          >
            <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>
              最近活动
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {(stats?.recentActivity || []).slice(0, 8).map((activity, i) => {
                const colors: Record<string, string> = {
                  login: "var(--info)",
                  create: "var(--success)",
                  update: "var(--warning)",
                  delete: "var(--error)",
                };
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: colors[activity.action] || "var(--text-muted)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {activity.action} {activity.target_type}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {activity.actor_type}
                      </p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                      {activity.created_at
                        ? new Date(activity.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </span>
                  </div>
                );
              })}
              {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  暂无活动记录
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Project Status Table */}
        <div
          className="rounded-xl overflow-hidden animate-fade-in-up"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            animationDelay: "150ms",
          }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              项目状态
            </h3>
          </div>
          <ProjectStatusTable />
        </div>
      </div>
    </div>
  );
}

function ProjectStatusTable() {
  const { data: projects } = trpc.projects.list.useQuery();

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "rgba(74,222,128,0.1)", text: "#4ade80", label: "运行中" },
    maintenance: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", label: "维护中" },
    development: { bg: "rgba(96,165,250,0.1)", text: "#60a5fa", label: "开发中" },
    offline: { bg: "rgba(248,113,113,0.1)", text: "#f87171", label: "已下线" },
  };

  return (
    <table className="w-full">
      <thead>
        <tr style={{ background: "var(--bg-elevated)" }}>
          {["项目名称", "URL", "状态", "最后更新", "操作"].map((h) => (
            <th
              key={h}
              className="text-left px-5 py-3 text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(projects || []).map((project) => {
          const status = statusColors[project.status] || statusColors.offline;
          return (
            <tr
              key={project.id}
              className="data-table-row"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <td className="px-5 py-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {project.name}
              </td>
              <td className="px-5 py-3 text-sm" style={{ color: "var(--text-gold)", fontFamily: "monospace" }}>
                {project.url}
              </td>
              <td className="px-5 py-3">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: status.bg, color: status.text }}
                >
                  {status.label}
                </span>
              </td>
              <td className="px-5 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                {project.updated_at ? new Date(project.updated_at).toLocaleDateString("zh-CN") : "-"}
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <button
                    className="p-1.5 rounded transition-colors duration-150"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--text-gold)";
                      e.currentTarget.style.background = "rgba(201,169,110,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    编辑
                  </button>
                  <a
                    href={`https://${project.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded transition-colors duration-150 text-xs"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--text-gold)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-muted)";
                    }}
                  >
                    访问 →
                  </a>
                </div>
              </td>
            </tr>
          );
        })}
        {(!projects || projects.length === 0) && (
          <tr>
            <td colSpan={5} className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
              暂无项目数据
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
