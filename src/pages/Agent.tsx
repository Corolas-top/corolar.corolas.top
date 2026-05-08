import { useState } from "react";
import { Bot, Key, Lock, Unlock, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";

const permissionsList = [
  { key: "projects", name: "项目管理", desc: "允许创建、编辑、删除项目", danger: false },
  { key: "users", name: "用户管理", desc: "允许查看和操作用户数据", danger: false },
  { key: "oauth", name: "OAuth 配置", desc: "允许修改 OAuth 设置", danger: false },
  { key: "self", name: "AI Agent 管理", desc: "允许修改 Agent 自身配置", danger: true },
  { key: "canvas", name: "画布访问", desc: "允许使用画布功能", danger: false },
  { key: "notes", name: "笔记访问", desc: "允许查看和编辑加密笔记", danger: false },
  { key: "dashboard", name: "系统监控", desc: "允许查看仪表盘和日志", danger: false },
  { key: "export", name: "数据库导出", desc: "允许导出用户数据", danger: true },
];

export default function Agent() {
  const utils = trpc.useUtils();
  const { data: status } = trpc.agent.getStatus.useQuery();
  const { data: logsData } = trpc.agent.getLogs.useQuery({ page: 1, limit: 20 });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [logPage, setLogPage] = useState(1);

  const toggleMutation = trpc.agent.toggleEnabled.useMutation({
    onSuccess: () => utils.agent.getStatus.invalidate(),
  });
  const updatePasswordMutation = trpc.agent.updatePassword.useMutation({
    onSuccess: () => {
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
    },
  });
  const updatePermsMutation = trpc.agent.updatePermissions.useMutation({
    onSuccess: () => {
      utils.agent.getStatus.invalidate();
      setHasChanges(false);
    },
  });

  const perms = status?.permissions || {};
  const mergedPerms = { ...perms, ...localPerms };

  const togglePerm = (key: string) => {
    setLocalPerms((prev) => ({ ...prev, [key]: !mergedPerms[key] }));
    setHasChanges(true);
  };

  const savePerms = () => {
    const finalPerms: Record<string, boolean> = {};
    permissionsList.forEach((p) => {
      finalPerms[p.key] = mergedPerms[p.key] || false;
    });
    updatePermsMutation.mutate({ permissions: finalPerms });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="AI Agent 管理" />

      <div className="flex-1 p-6 max-w-[1200px] mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            AI Agent 管理
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            为 AI 助理配置控制台访问权限。AI Agent 使用独立的认证通道。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Status Card */}
          <div className="space-y-4">
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(201,169,110,0.1)" }}
                >
                  <Bot size={24} style={{ color: "var(--text-gold)" }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    AI Agent
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: status?.enabled ? "var(--success)" : "var(--error)" }}
                    />
                    <span className="text-xs" style={{ color: status?.enabled ? "var(--success)" : "var(--error)" }}>
                      {status?.enabled ? "在线可访问" : "已禁用"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>最后访问</span>
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {status?.lastAccess ? new Date(status.lastAccess).toLocaleString("zh-CN") : "从未"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>今日 API 调用</span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {status?.todayCalls ?? 0} 次
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm border transition-all duration-150"
                  style={{ borderColor: "var(--border-medium)", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-gold)";
                    e.currentTarget.style.color = "var(--text-gold)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-medium)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <Key size={14} />
                  重置 Agent 密码
                </button>
                <button
                  onClick={() => {
                    if (confirm(status?.enabled ? "禁用 AI Agent 访问？" : "启用 AI Agent 访问？")) {
                      toggleMutation.mutate({ enabled: !status?.enabled });
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: status?.enabled ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)",
                    color: status?.enabled ? "var(--error)" : "var(--success)",
                  }}
                >
                  {status?.enabled ? <Lock size={14} /> : <Unlock size={14} />}
                  {status?.enabled ? "禁用 Agent" : "启用 Agent"}
                </button>
              </div>
            </div>

            {/* Password Form */}
            {showPasswordForm && (
              <div
                className="rounded-xl p-5 animate-fade-in-up"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
              >
                <h4 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
                  重置密码
                </h4>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="当前密码"
                    className="w-full h-10 px-3 rounded-md text-sm outline-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="新密码（至少6位）"
                    className="w-full h-10 px-3 rounded-md text-sm outline-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!currentPassword || !newPassword || newPassword.length < 6) return;
                      updatePasswordMutation.mutate({ currentPassword, newPassword });
                    }}
                    disabled={updatePasswordMutation.isPending}
                    className="w-full h-10 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ background: "var(--text-gold)", color: "var(--bg-primary)" }}
                  >
                    {updatePasswordMutation.isPending ? "更新中..." : "更新密码"}
                  </button>
                  {updatePasswordMutation.error && (
                    <p className="text-xs" style={{ color: "var(--error)" }}>
                      {updatePasswordMutation.error.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Permissions */}
          <div
            className="lg:col-span-2 rounded-xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                权限配置
              </h3>
              {hasChanges && (
                <button
                  onClick={savePerms}
                  disabled={updatePermsMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--text-gold)", color: "var(--bg-primary)" }}
                >
                  {updatePermsMutation.isPending ? "保存中..." : "保存权限"}
                </button>
              )}
            </div>

            <div className="space-y-1">
              {permissionsList.map((perm) => {
                const isOn = !!mergedPerms[perm.key];
                return (
                  <div
                    key={perm.key}
                    className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors duration-150"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: perm.danger ? "var(--error)" : "var(--text-primary)" }}>
                          {perm.name}
                        </span>
                        {perm.danger && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ background: "rgba(248,113,113,0.1)", color: "var(--error)" }}
                          >
                            危险
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {perm.desc}
                      </p>
                    </div>
                    <button
                      onClick={() => togglePerm(perm.key)}
                      className="switch-track transition-colors duration-200 flex-shrink-0"
                      style={{
                        background: isOn ? (perm.danger ? "#f87171" : "var(--text-gold)") : "#374151",
                      }}
                    >
                      <div
                        className="switch-thumb"
                        style={{
                          background: isOn ? "#f5f5f0" : "#9CA3AF",
                          transform: isOn ? "translateX(24px)" : "translateX(0)",
                        }}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Access Logs */}
        <div
          className="mt-6 rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              访问日志
            </h3>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all duration-150"
              style={{ borderColor: "var(--border-medium)", color: "var(--text-secondary)" }}
            >
              <Download size={13} />
              导出 CSV
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {["时间", "操作", "资源", "结果", "IP"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(logsData?.items || []).map((log, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(log.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                    {log.action}
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {log.resource}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: log.result === "success" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                        color: log.result === "success" ? "var(--success)" : "var(--error)",
                      }}
                    >
                      {log.result}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>
                    {log.ip || "-"}
                  </td>
                </tr>
              ))}
              {(!logsData?.items || logsData.items.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
                    暂无访问日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {logsData && logsData.total > 20 && (
            <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                共 {logsData.total} 条
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLogPage(Math.max(1, logPage - 1))}
                  disabled={logPage === 1}
                  className="p-1.5 rounded disabled:opacity-30"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setLogPage(logPage + 1)}
                  className="p-1.5 rounded"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
