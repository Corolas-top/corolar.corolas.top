import { useState } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Ban, Trash2, Eye } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";

const statusColors: Record<string, { dot: string; text: string; label: string }> = {
  active: { dot: "#4ade80", text: "var(--success)", label: "正常" },
  banned: { dot: "#f87171", text: "var(--error)", label: "封禁" },
  pending: { dot: "#fbbf24", text: "var(--warning)", label: "待验证" },
};

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.users.list.useQuery(
    { page, limit: 20, search: debouncedSearch || undefined },
    { placeholderData: (prev) => prev },
  );

  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.users.updateStatus.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
    },
  });
  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      setSelectedUser(null);
    },
  });

  // Debounce search
  const handleSearch = (val: string) => {
    setSearch(val);
    setTimeout(() => setDebouncedSearch(val), 300);
  };

  const users = data?.items || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="用户数据库" subtitle="User Database" />

      <div className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            用户列表
            <span className="text-sm font-normal ml-2" style={{ color: "var(--text-muted)" }}>
              ({data?.total ?? 0} 人)
            </span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索用户..."
                className="w-[240px] h-10 pl-9 pr-4 rounded-lg text-sm outline-none transition-all duration-150"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <button
              onClick={() => refetch()}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-gold)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {["ID", "用户名", "邮箱", "来源", "注册时间", "状态", "操作"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded animate-pulse" style={{ background: "var(--bg-elevated)", width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>
                    暂无用户数据
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const status = statusColors[user.status] || statusColors.pending;
                  return (
                    <tr
                      key={user.id}
                      className="data-table-row cursor-pointer"
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                    >
                      <td className="px-5 py-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>
                        #{user.id}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                            style={{ background: "var(--bg-elevated)", color: "var(--text-gold)" }}
                          >
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          {user.username}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
                        {user.email || "-"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded text-xs"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                        >
                          {user.source_project}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString("zh-CN") : "-"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
                          <span className="text-xs" style={{ color: status.text }}>
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(user.id);
                            }}
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
                            <Eye size={14} />
                          </button>
                          {user.status !== "banned" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`封禁用户 "${user.username}"？`)) {
                                  updateStatusMutation.mutate({ id: user.id, status: "banned" });
                                }
                              }}
                              className="p-1.5 rounded transition-colors duration-150"
                              style={{ color: "var(--text-secondary)" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "var(--warning)";
                                e.currentTarget.style.background = "rgba(251,191,36,0.1)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = "var(--text-secondary)";
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <Ban size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ id: user.id, status: "active" });
                              }}
                              className="p-1.5 rounded transition-colors duration-150 text-xs"
                              style={{ color: "var(--success)" }}
                            >
                              解封
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`删除用户 "${user.username}"？此操作不可恢复。`)) {
                                deleteMutation.mutate({ id: user.id });
                              }
                            }}
                            className="p-1.5 rounded transition-colors duration-150"
                            style={{ color: "var(--text-secondary)" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "var(--error)";
                              e.currentTarget.style.background = "rgba(248,113,113,0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--text-secondary)";
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-5 py-3 border-t"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                第 {page} / {totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded transition-colors duration-150 disabled:opacity-30"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded transition-colors duration-150 disabled:opacity-30"
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
