import { useState } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Ban, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";

const statusMap: Record<string, { dot: string; text: string; label: string }> = {
  active: { dot: "#4ade80", text: "#4ade80", label: "正常" },
  banned: { dot: "#f87171", text: "#f87171", label: "封禁" },
  pending: { dot: "#fbbf24", text: "#fbbf24", label: "待验证" },
};

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.users.list.useQuery({ page, limit: 20, search: debounced || undefined }, { placeholderData: (p) => p });
  const updateMut = trpc.users.updateStatus.useMutation({ onSuccess: () => utils.users.list.invalidate() });
  const deleteMut = trpc.users.delete.useMutation({ onSuccess: () => utils.users.list.invalidate() });

  const handleSearch = (v: string) => { setSearch(v); setTimeout(() => setDebounced(v), 300); };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="用户数据库" subtitle="User Database" />
      <div className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-coro-text-primary">用户列表 <span className="text-sm font-normal text-coro-text-muted ml-2">({data?.total ?? 0} 人)</span></h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-coro-text-muted" />
              <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="搜索用户..."
                className="w-[240px] h-10 pl-9 pr-4 rounded-lg text-sm outline-none bg-coro-elevated border border-coro-border text-coro-text-primary focus:border-coro-gold-30 transition-all" />
            </div>
            <button onClick={() => refetch()} className="w-10 h-10 rounded-lg flex items-center justify-center bg-coro-elevated border border-coro-border text-coro-text-secondary hover:text-coro-gold transition-colors"><RefreshCw size={16} /></button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden bg-coro-card border border-coro-border">
          <table className="w-full">
            <thead><tr className="bg-coro-elevated">
              {["ID","用户名","邮箱","来源","注册时间","状态","操作"].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-medium text-coro-text-secondary">{h}</th>)}
            </tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 rounded animate-pulse bg-coro-elevated" /></td>)}</tr>) :
              (data?.items ?? []).length === 0 ? <tr><td colSpan={7} className="text-center py-16 text-sm text-coro-text-muted">暂无用户数据</td></tr> :
              (data?.items ?? []).map(u => {
                const st = statusMap[u.status] || statusMap.pending;
                return (
                  <tr key={u.id} className="border-b border-coro-border hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3 text-xs text-coro-text-muted font-mono">#{u.id}</td>
                    <td className="px-5 py-3 text-sm font-medium text-coro-text-primary">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-coro-elevated text-coro-gold">{u.username.charAt(0).toUpperCase()}</div>
                        {u.username}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-coro-text-secondary font-mono">{u.email || "-"}</td>
                    <td className="px-5 py-3"><span className="inline-flex px-2 py-0.5 rounded text-xs bg-coro-elevated text-coro-text-secondary">{u.source_project}</span></td>
                    <td className="px-5 py-3 text-xs text-coro-text-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString("zh-CN") : "-"}</td>
                    <td className="px-5 py-3"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} /><span className="text-xs" style={{ color: st.text }}>{st.label}</span></div></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {u.status !== "banned" ? (
                          <button onClick={() => { if (confirm(`封禁 "${u.username}"？`)) updateMut.mutate({ id: u.id, status: "banned" }); }} className="p-1.5 rounded text-coro-text-secondary hover:text-coro-warning hover:bg-coro-warning/10 transition-colors"><Ban size={14} /></button>
                        ) : (
                          <button onClick={() => updateMut.mutate({ id: u.id, status: "active" })} className="p-1.5 rounded text-xs text-coro-success">解封</button>
                        )}
                        <button onClick={() => { if (confirm(`删除 "${u.username}"？`)) deleteMut.mutate({ id: u.id }); }} className="p-1.5 rounded text-coro-text-secondary hover:text-coro-error hover:bg-coro-error/10 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(data?.pages ?? 1) > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-coro-border">
              <span className="text-xs text-coro-text-muted">第 {page} / {data?.pages} 页</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded text-coro-text-secondary disabled:opacity-30"><ChevronLeft size={16} /></button>
                <button onClick={() => setPage(Math.min(data?.pages ?? 1, page + 1))} disabled={page === (data?.pages ?? 1)} className="p-1.5 rounded text-coro-text-secondary disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
