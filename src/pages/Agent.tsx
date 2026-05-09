import { useState, useEffect } from "react";
import { Bot, Key, Lock, Unlock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Topbar from "@/components/Topbar";

const permsList = [
  { key: "projects", name: "项目管理", desc: "创建、编辑、删除项目", danger: false },
  { key: "users", name: "用户管理", desc: "查看和操作用户数据", danger: false },
  { key: "oauth", name: "OAuth 配置", desc: "修改 OAuth 设置", danger: false },
  { key: "self", name: "AI Agent 管理", desc: "修改 Agent 自身配置", danger: true },
  { key: "canvas", name: "画布访问", desc: "使用画布功能", danger: false },
  { key: "notes", name: "笔记访问", desc: "查看和编辑加密笔记", danger: false },
  { key: "dashboard", name: "系统监控", desc: "查看仪表盘和日志", danger: false },
  { key: "export", name: "数据库导出", desc: "导出用户数据", danger: true },
];

export default function AgentPage() {
  const [enabled, setEnabled] = useState(false);
  const [lastAccess, setLastAccess] = useState<string | null>(null);
  const [todayCalls, setTodayCalls] = useState(0);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [changed, setChanged] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [showPw, setShowPw] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: settings } = await supabase.from("admin_settings").select("key,value");
    const map: Record<string, string> = {};
    (settings ?? []).forEach((r: any) => { map[r.key] = r.value; });
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase.from("agent_access_logs").select("*", { count: "exact" }).gte("created_at", today);
    const { data: lastLog } = await supabase.from("agent_access_logs").select("created_at").order("created_at", { ascending: false }).limit(1).single();
    const { data: logsData } = await supabase.from("agent_access_logs").select("*").order("created_at", { ascending: false }).limit(20);

    setEnabled(map["agent_enabled"] === "true");
    setLastAccess(lastLog?.created_at ?? null);
    setTodayCalls(count ?? 0);
    const parsedPerms = map["agent_permissions"] ? JSON.parse(map["agent_permissions"]) : {};
    setPerms(parsedPerms);
    setLogs(logsData ?? []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const merged = { ...perms, ...localPerms };

  const toggleEnabled = async () => {
    await supabase.from("admin_settings").upsert({ key: "agent_enabled", value: String(!enabled), updated_at: new Date().toISOString() });
    fetchData();
  };

  const savePermissions = async () => {
    const final: Record<string, boolean> = {};
    permsList.forEach(p => { final[p.key] = !!merged[p.key]; });
    await supabase.from("admin_settings").upsert({ key: "agent_permissions", value: JSON.stringify(final), updated_at: new Date().toISOString() });
    setPerms(final);
    setLocalPerms({});
    setChanged(false);
  };

  const updatePassword = async () => {
    if (!curPw || newPw.length < 6) return;
    setPwSaving(true); setPwError("");
    const bcrypt = await import("bcryptjs");
    const { data } = await supabase.from("admin_settings").select("value").eq("key", "agent_password_hash").single();
    const hash = data?.value;
    if (!hash) { setPwError("Agent 未配置"); setPwSaving(false); return; }
    if (!bcrypt.default.compareSync(curPw, hash)) { setPwError("密码不正确"); setPwSaving(false); return; }
    const newHash = bcrypt.default.hashSync(newPw, 12);
    await supabase.from("admin_settings").upsert({ key: "agent_password_hash", value: newHash, updated_at: new Date().toISOString() });
    setShowPw(false); setCurPw(""); setNewPw("");
    setPwSaving(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="AI Agent 管理" />
      <div className="flex-1 p-6 max-w-[1200px] mx-auto w-full">
        <div className="mb-6"><h1 className="text-2xl font-semibold text-[#f5f5f0] mb-2">AI Agent 管理</h1><p className="text-sm text-[rgba(245,245,240,0.6)]">为 AI 助理配置控制台访问权限。</p></div>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
            <div className="space-y-4"><div className="h-[300px] rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]" /></div>
            <div className="lg:col-span-2 h-[400px] rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="rounded-xl p-5 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[rgba(201,169,110,0.1)]"><Bot size={24} className="text-[#c9a96e]" /></div>
                    <div>
                      <h3 className="text-base font-semibold text-[#f5f5f0]">AI Agent</h3>
                      <div className="flex items-center gap-1.5 mt-0.5"><div className="w-2 h-2 rounded-full animate-pulse" style={{ background: enabled ? "#4ade80" : "#f87171" }} /><span className="text-xs" style={{ color: enabled ? "#4ade80" : "#f87171" }}>{enabled ? "在线" : "已禁用"}</span></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.06)]"><span className="text-sm text-[rgba(245,245,240,0.6)]">最后访问</span><span className="text-sm text-[#f5f5f0]">{lastAccess ? new Date(lastAccess).toLocaleString("zh-CN") : "从未"}</span></div>
                    <div className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.06)]"><span className="text-sm text-[rgba(245,245,240,0.6)]">今日调用</span><span className="text-sm text-[#f5f5f0] font-mono">{todayCalls} 次</span></div>
                  </div>
                  <div className="mt-5 space-y-2">
                    <button onClick={() => setShowPw(!showPw)} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm border border-[rgba(255,255,255,0.1)] text-[rgba(245,245,240,0.6)] hover:border-[rgba(201,169,110,0.3)] hover:text-[#c9a96e] transition-all"><Key size={14} /> 重置密码</button>
                    <button onClick={() => { if (confirm(enabled ? "禁用？" : "启用？")) toggleEnabled(); }} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm transition-all" style={{ background: enabled ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)", color: enabled ? "#f87171" : "#4ade80" }}>{enabled ? <Lock size={14} /> : <Unlock size={14} />}{enabled ? "禁用 Agent" : "启用 Agent"}</button>
                  </div>
                </div>
                {showPw && (
                  <div className="rounded-xl p-5 animate-fade-in-up bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
                    <h4 className="text-sm font-medium mb-3 text-[#f5f5f0]">重置密码</h4>
                    <div className="space-y-3">
                      <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="当前密码" className="w-full h-10 px-3 rounded-md text-sm bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0] outline-none" />
                      <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="新密码（至少6位）" className="w-full h-10 px-3 rounded-md text-sm bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0] outline-none" />
                      <button onClick={updatePassword} disabled={pwSaving} className="w-full h-10 rounded-lg text-sm font-medium bg-[#c9a96e] text-[#050505] hover:brightness-110 disabled:opacity-50">{pwSaving ? "更新中..." : "更新密码"}</button>
                      {pwError && <p className="text-xs text-[#f87171]">{pwError}</p>}
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:col-span-2 rounded-xl p-5 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-[#f5f5f0]">权限配置</h3>
                  {changed && <button onClick={savePermissions} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#c9a96e] text-[#050505] hover:brightness-110">保存权限</button>}
                </div>
                <div className="space-y-1">
                  {permsList.map(p => {
                    const on = !!merged[p.key];
                    return (
                      <div key={p.key} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: p.danger ? "#f87171" : "#f5f5f0" }}>{p.name}</span>
                            {p.danger && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgba(248,113,113,0.1)] text-[#f87171]">危险</span>}
                          </div>
                          <p className="text-xs text-[rgba(245,245,240,0.35)] mt-0.5">{p.desc}</p>
                        </div>
                        <button onClick={() => { setLocalPerms(prev => ({ ...prev, [p.key]: !on })); setChanged(true); }} className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0" style={{ background: on ? (p.danger ? "#f87171" : "#c9a96e") : "#374151" }}>
                          <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform" style={{ background: on ? "#f5f5f0" : "#9CA3AF", transform: on ? "translateX(24px)" : "translateX(0)" }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl overflow-hidden bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
              <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]"><h3 className="text-base font-semibold text-[#f5f5f0]">访问日志</h3></div>
              <table className="w-full">
                <thead><tr className="bg-[#111]">{["时间","操作","资源","结果","IP"].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[rgba(245,245,240,0.6)]">{h}</th>)}</tr></thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={i} className="border-b border-[rgba(255,255,255,0.06)]">
                      <td className="px-5 py-3 text-xs text-[rgba(245,245,240,0.35)]">{new Date(l.created_at).toLocaleString("zh-CN")}</td>
                      <td className="px-5 py-3 text-sm text-[#f5f5f0]">{l.action}</td>
                      <td className="px-5 py-3 text-sm text-[rgba(245,245,240,0.6)]">{l.resource}</td>
                      <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: l.result === "success" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", color: l.result === "success" ? "#4ade80" : "#f87171" }}>{l.result}</span></td>
                      <td className="px-5 py-3 text-xs text-[rgba(245,245,240,0.35)] font-mono">{l.ip || "-"}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-sm text-[rgba(245,245,240,0.35)]">暂无数据</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
