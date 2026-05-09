import { useState, useEffect } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Ban, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
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
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const limit = 20;

  const fetchUsers = async () => {
    setIsLoading(true);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let q = supabase.from("users").select("*", { count: "exact" });
    if (debounced) q = q.or(`username.ilike.%${debounced}%,email.ilike.%${debounced}%`);
    const { data, error, count } = await q.range(from, to).order("created_at", { ascending: false });
    if (!error) { setItems(data ?? []); setTotal(count ?? 0); }
    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [page, debounced]);

  const handleSearch = (v: string) => { setSearch(v); setTimeout(() => setDebounced(v), 300); };

  const updateStatus = async (id: number, status: string) => {
    await supabase.from("users").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    fetchUsers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("删除？")) return;
    await supabase.from("users").delete().eq("id", id);
    fetchUsers();
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="用户数据库" subtitle="User Database" />
      <div className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-[#f5f5f0]">用户列表 <span className="text-sm font-normal text-[rgba(245,245,240,0.35)] ml-2">({total} 人)</span></h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(245,245,240,0.35)]" />
              <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="搜索用户..."
                className="w-[240px] h-10 pl-9 pr-4 rounded-lg text-sm outline-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0] focus:border-[rgba(201,169,110,0.3)] transition-all" />
            </div>
            <button onClick={fetchUsers} className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#111] border border-[rgba(255,255,255,0.06)] text-[rgba(245,245,240,0.6)] hover:text-[#c9a96e] transition-colors"><RefreshCw size={16} /></button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
          <table className="w-full">
            <thead><tr className="bg-[#111]">
              {["ID","用户名","邮箱","来源","注册时间","状态","操作"].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[rgba(245,245,240,0.6)]">{h}</th>)}
            </tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 rounded animate-pulse bg-[#111]" /></td>)}</tr>) :
              items.length === 0 ? <tr><td colSpan={7} className="text-center py-16 text-sm text-[rgba(245,245,240,0.35)]">暂无数据</td></tr> :
              items.map(u => {
                const st = statusMap[u.status] || statusMap.pending;
                return (
                  <tr key={u.id} className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                    <td className="px-5 py-3 text-xs text-[rgba(245,245,240,0.35)] font-mono">#{u.id}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#f5f5f0]"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-[#111] text-[#c9a96e]">{u.username?.charAt(0)?.toUpperCase() || "?"}</div>{u.username || "-"}</div></td>
                    <td className="px-5 py-3 text-sm text-[rgba(245,245,240,0.6)] font-mono">{u.email || "-"}</td>
                    <td className="px-5 py-3"><span className="inline-flex px-2 py-0.5 rounded text-xs bg-[#111] text-[rgba(245,245,240,0.6)]">{u.source_project || "-"}</span></td>
                    <td className="px-5 py-3 text-xs text-[rgba(245,245,240,0.35)]">{u.created_at ? new Date(u.created_at).toLocaleDateString("zh-CN") : "-"}</td>
                    <td className="px-5 py-3"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} /><span className="text-xs" style={{ color: st.text }}>{st.label}</span></div></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {u.status !== "banned" ? (
                          <button onClick={() => { if (confirm(`封禁 "${u.username}"？`)) updateStatus(u.id, "banned"); }} className="p-1.5 rounded text-[rgba(245,245,240,0.6)] hover:text-[#fbbf24] hover:bg-[rgba(251,191,36,0.1)] transition-colors"><Ban size={14} /></button>
                        ) : <button onClick={() => updateStatus(u.id, "active")} className="p-1.5 rounded text-xs text-[#4ade80]">解封</button>}
                        <button onClick={() => { if (confirm(`删除 "${u.username}"？`)) handleDelete(u.id); }} className="p-1.5 rounded text-[rgba(245,245,240,0.6)] hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(255,255,255,0.06)]">
              <span className="text-xs text-[rgba(245,245,240,0.35)]">第 {page} / {pages} 页</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(1, page-1))} disabled={page===1} className="p-1.5 rounded text-[rgba(245,245,240,0.6)] disabled:opacity-30"><ChevronLeft size={16} /></button>
                <button onClick={() => setPage(Math.min(pages, page+1))} disabled={page===pages} className="p-1.5 rounded text-[rgba(245,245,240,0.6)] disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
