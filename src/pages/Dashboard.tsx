import { useState, useEffect } from "react";
import { Globe, Users, Eye, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Topbar from "@/components/Topbar";
import { useLang } from "@/hooks/useLang";

const statCards = [
  { key: "projects", label: "dashboard.projectCount", icon: Globe, color: "#c9a96e" },
  { key: "users", label: "dashboard.userCount", icon: Users, color: "#60a5fa" },
  { key: "visits", label: "dashboard.todayVisits", icon: Eye, color: "#4ade80" },
  { key: "status", label: "dashboard.systemStatus", icon: Activity, color: "#4ade80" },
];

export default function Dashboard() {
  const { t } = useLang();
  const [projectCount, setProjectCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      const [{ count: pc }, { count: uc }, { data: recent }, { data: plist }] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("projects").select("*").order("sort_order", { ascending: true }),
      ]);
      if (mounted) {
        setProjectCount(pc ?? 0);
        setUserCount(uc ?? 0);
        setRecentActivity(recent ?? []);
        setProjects(plist ?? []);
        setIsLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  const values: Record<string, string | number> = {
    projects: projectCount,
    users: userCount,
    visits: "\u2014",
    status: t("dashboard.normal"),
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="dashboard.title" subtitle="Dashboard Overview" />
      <div className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-4xl font-light text-[#f5f5f0] tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-xs mt-1 tracking-wide text-[rgba(245,245,240,0.35)]">Dashboard Overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={c.key} className="rounded-xl p-5 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.color}1a` }}>
                    <Icon size={20} style={{ color: c.color }} />
                  </div>
                  <span className="text-xs font-medium text-[rgba(245,245,240,0.6)]">{t(c.label)}</span>
                </div>
                <div className="text-2xl font-semibold text-[#f5f5f0] font-mono">{values[c.key]}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 rounded-xl p-5 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-sm font-medium text-[#f5f5f0] mb-4">{t("dashboard.visitTrend")}</h3>
            <div className="h-[300px] flex items-center justify-center text-sm text-[rgba(245,245,240,0.35)]">
              {t("dashboard.noData")}
            </div>
          </div>

          <div className="rounded-xl p-5 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-sm font-medium text-[#f5f5f0] mb-4">{t("dashboard.recentActivity")}</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#60a5fa]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#f5f5f0] truncate">{a.action} {a.target_type}</p>
                    <p className="text-xs text-[rgba(245,245,240,0.35)]">{a.actor_type}</p>
                  </div>
                  <span className="text-xs text-[rgba(245,245,240,0.35)] flex-shrink-0">
                    {a.created_at ? new Date(a.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-center py-8 text-[rgba(245,245,240,0.35)]">{t("dashboard.noData")}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
            <h3 className="text-sm font-medium text-[#f5f5f0]">{t("dashboard.projectStatus")}</h3>
          </div>
          <ProjectTable data={projects} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

const statusMap: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(74,222,128,0.1)", text: "#4ade80", label: "运行中" },
  maintenance: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", label: "维护中" },
  development: { bg: "rgba(96,165,250,0.1)", text: "#60a5fa", label: "开发中" },
  offline: { bg: "rgba(248,113,113,0.1)", text: "#f87171", label: "已下线" },
};

function ProjectTable({ data, isLoading }: { data: any[]; isLoading: boolean }) {
  return (
    <table className="w-full">
      <thead><tr className="bg-[#111]">
        {["项目名称","URL","状态","最后更新","操作"].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[rgba(245,245,240,0.6)]">{h}</th>)}
      </tr></thead>
      <tbody>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 rounded animate-pulse bg-[#111]" /></td>)}</tr>
          ))
        ) : (
          <>
            {data.map(p => {
              const s = statusMap[p.status] || statusMap.offline;
              return (
                <tr key={p.id} className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-[#f5f5f0]">{p.name}</td>
                  <td className="px-5 py-3 text-sm text-[#c9a96e] font-mono">{p.url}</td>
                  <td className="px-5 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.text }}>{s.label}</span></td>
                  <td className="px-5 py-3 text-xs text-[rgba(245,245,240,0.35)]">{p.updated_at ? new Date(p.updated_at).toLocaleDateString("zh-CN") : "-"}</td>
                  <td className="px-5 py-3"><a href={`https://${p.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[rgba(245,245,240,0.35)] hover:text-[#c9a96e] transition-colors">访问 &rarr;</a></td>
                </tr>
              );
            })}
            {data.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-sm text-[rgba(245,245,240,0.35)]">暂无数据</td></tr>}
          </>
        )}
      </tbody>
    </table>
  );
}
