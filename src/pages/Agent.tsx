import { useState } from "react";
import { Bot, Key, Lock, Unlock } from "lucide-react";
import { trpc } from "@/providers/trpc";
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
  const utils = trpc.useUtils();
  const { data: status } = trpc.agent.getStatus.useQuery();
  const { data: logsData } = trpc.agent.getLogs.useQuery({ page: 1, limit: 20 });

  const [showPw, setShowPw] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [changed, setChanged] = useState(false);

  const toggleMut = trpc.agent.toggleEnabled.useMutation({ onSuccess: () => utils.agent.getStatus.invalidate() });
  const pwMut = trpc.agent.updatePassword.useMutation({ onSuccess: () => { setShowPw(false); setCurPw(""); setNewPw(""); } });
  const permsMut = trpc.agent.updatePermissions.useMutation({ onSuccess: () => { utils.agent.getStatus.invalidate(); setChanged(false); } });

  const perms = status?.permissions || {};
  const merged = { ...perms, ...localPerms };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="AI Agent 管理" />
      <div className="flex-1 p-6 max-w-[1200px] mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-coro-text-primary mb-2">AI Agent 管理</h1>
          <p className="text-sm text-coro-text-secondary">为 AI 助理配置控制台访问权限。AI Agent 使用独立的认证通道。</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="rounded-xl p-5 bg-coro-card border border-coro-border">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-coro-gold-10"><Bot size={24} className="text-coro-gold" /></div>
                <div>
                  <h3 className="text-base font-semibold text-coro-text-primary">AI Agent</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: status?.enabled ? "#4ade80" : "#f87171" }} />
                    <span className="text-xs" style={{ color: status?.enabled ? "#4ade80" : "#f87171" }}>{status?.enabled ? "在线可访问" : "已禁用"}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-coro-border"><span className="text-sm text-coro-text-secondary">最后访问</span><span className="text-sm text-coro-text-primary">{status?.lastAccess ? new Date(status.lastAccess).toLocaleString("zh-CN") : "从未"}</span></div>
                <div className="flex justify-between py-2 border-b border-coro-border"><span className="text-sm text-coro-text-secondary">今日 API 调用</span><span className="text-sm text-coro-text-primary font-mono">{status?.todayCalls ?? 0} 次</span></div>
              </div>
              <div className="mt-5 space-y-2">
                <button onClick={() => setShowPw(!showPw)} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm border border-coro-border-medium text-coro-text-secondary hover:border-coro-gold-30 hover:text-coro-gold transition-all"><Key size={14} /> 重置 Agent 密码</button>
                <button onClick={() => { if (confirm(status?.enabled ? "禁用？" : "启用？")) toggleMut.mutate({ enabled: !status?.enabled }); }}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm transition-all"
                  style={{ background: status?.enabled ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)", color: status?.enabled ? "#f87171" : "#4ade80" }}>
                  {status?.enabled ? <Lock size={14} /> : <Unlock size={14} />}{status?.enabled ? "禁用 Agent" : "启用 Agent"}
                </button>
              </div>
            </div>

            {showPw && (
              <div className="rounded-xl p-5 animate-fade-in-up bg-coro-card border border-coro-border">
                <h4 className="text-sm font-medium mb-3 text-coro-text-primary">重置密码</h4>
                <div className="space-y-3">
                  <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="当前密码" className="w-full h-10 px-3 rounded-md text-sm bg-coro-elevated border border-coro-border text-coro-text-primary outline-none" />
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="新密码（至少6位）" className="w-full h-10 px-3 rounded-md text-sm bg-coro-elevated border border-coro-border text-coro-text-primary outline-none" />
                  <button onClick={() => { if (curPw && newPw.length >= 6) pwMut.mutate({ currentPassword: curPw, newPassword: newPw }); }} disabled={pwMut.isPending} className="w-full h-10 rounded-lg text-sm font-medium bg-coro-gold text-coro-bg hover:brightness-110 disabled:opacity-50">{pwMut.isPending ? "更新中..." : "更新密码"}</button>
                  {pwMut.error && <p className="text-xs text-coro-error">{pwMut.error.message}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 rounded-xl p-5 bg-coro-card border border-coro-border">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-coro-text-primary">权限配置</h3>
              {changed && <button onClick={() => { const final: Record<string, boolean> = {}; permsList.forEach(p => final[p.key] = !!merged[p.key]); permsMut.mutate({ permissions: final }); }} disabled={permsMut.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-coro-gold text-coro-bg hover:brightness-110 disabled:opacity-50">{permsMut.isPending ? "保存中..." : "保存权限"}</button>}
            </div>
            <div className="space-y-1">
              {permsList.map(p => {
                const on = !!merged[p.key];
                return (
                  <div key={p.key} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: p.danger ? "#f87171" : "#f5f5f0" }}>{p.name}</span>
                        {p.danger && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-coro-error/10 text-coro-error">危险</span>}
                      </div>
                      <p className="text-xs text-coro-text-muted mt-0.5">{p.desc}</p>
                    </div>
                    <button onClick={() => { setLocalPerms(prev => ({ ...prev, [p.key]: !on })); setChanged(true); }}
                      className="switch-track flex-shrink-0" style={{ background: on ? (p.danger ? "#f87171" : "#c9a96e") : "#374151" }}>
                      <div className="switch-thumb" style={{ background: on ? "#f5f5f0" : "#9CA3AF", transform: on ? "translateX(24px)" : "translateX(0)" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl overflow-hidden bg-coro-card border border-coro-border">
          <div className="px-5 py-4 border-b border-coro-border"><h3 className="text-base font-semibold text-coro-text-primary">访问日志</h3></div>
          <table className="w-full">
            <thead><tr className="bg-coro-elevated">{["时间","操作","资源","结果","IP"].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-medium text-coro-text-secondary">{h}</th>)}</tr></thead>
            <tbody>
              {(logsData?.items ?? []).map((l, i) => (
                <tr key={i} className="border-b border-coro-border">
                  <td className="px-5 py-3 text-xs text-coro-text-muted">{new Date(l.created_at).toLocaleString("zh-CN")}</td>
                  <td className="px-5 py-3 text-sm text-coro-text-primary">{l.action}</td>
                  <td className="px-5 py-3 text-sm text-coro-text-secondary">{l.resource}</td>
                  <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: l.result === "success" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", color: l.result === "success" ? "#4ade80" : "#f87171" }}>{l.result}</span></td>
                  <td className="px-5 py-3 text-xs text-coro-text-muted font-mono">{l.ip || "-"}</td>
                </tr>
              ))}
              {(!logsData?.items || logsData.items.length === 0) && <tr><td colSpan={5} className="text-center py-12 text-sm text-coro-text-muted">暂无访问日志</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
