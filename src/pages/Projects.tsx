import { useState } from "react";
import { Plus, Pencil, ExternalLink, X, Copy, Check } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";
import { useLang } from "@/hooks/useLang";

const statusMap: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(74,222,128,0.1)", text: "#4ade80", label: "运行中" },
  maintenance: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", label: "维护中" },
  development: { bg: "rgba(96,165,250,0.1)", text: "#60a5fa", label: "开发中" },
  offline: { bg: "rgba(248,113,113,0.1)", text: "#f87171", label: "已下线" },
};

const emptyForm = { name: "", slug: "", url: "", overview: "", description: "", status: "development" as const };

export default function Projects() {
  const { t } = useLang();
  const utils = trpc.useUtils();
  const { data: projects } = trpc.projects.list.useQuery();
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const createMut = trpc.projects.create.useMutation({ onSuccess: () => { utils.projects.list.invalidate(); close(); } });
  const updateMut = trpc.projects.update.useMutation({ onSuccess: () => { utils.projects.list.invalidate(); close(); } });
  const deleteMut = trpc.projects.delete.useMutation({ onSuccess: () => utils.projects.list.invalidate() });

  const close = () => { setShow(false); setEditId(null); setForm(emptyForm); setErrors({}); };
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "必填";
    if (!form.slug.trim()) e.slug = "必填";
    if (!form.url.trim()) e.url = "必填";
    else if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(form.url)) e.url = "无效域名";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const copyId = (id: string) => { navigator.clipboard.writeText(id); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="projects.title" />
      <div className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-[#f5f5f0]">{t("projects.title")}</h1>
          <button onClick={() => { setForm(emptyForm); setEditId(null); setShow(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#c9a96e] text-[#050505] hover:brightness-110 transition-all">
            <Plus size={16} /> {t("projects.newProject")}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(projects ?? []).map(p => {
            const s = statusMap[p.status] || statusMap.offline;
            return (
              <div key={p.id} className="rounded-xl overflow-hidden bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-all">
                <div className="h-[120px] flex items-center justify-center relative bg-[#111]">
                  <span className="text-3xl font-light text-[#c9a96e]" style={{ fontFamily: "serif" }}>{p.name.charAt(0).toUpperCase()}</span>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: s.bg, color: s.text }}>{s.label}</span>
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-[#f5f5f0]">{p.name}</h3>
                  <a href={`https://${p.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c9a96e] font-mono block mb-2 hover:underline">{p.url}</a>
                  {/* Corolas Project ID */}
                  {p.corolas_project_id && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded bg-[#111] border border-[rgba(255,255,255,0.06)]">
                      <span className="text-[10px] text-[rgba(245,245,240,0.35)]">CPID:</span>
                      <span className="text-xs text-[rgba(245,245,240,0.6)] font-mono truncate">{p.corolas_project_id}</span>
                      <button onClick={() => copyId(p.corolas_project_id!)} className="ml-auto text-[rgba(245,245,240,0.35)] hover:text-[#c9a96e] transition-colors">
                        {copiedId === p.corolas_project_id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-[rgba(245,245,240,0.6)] line-clamp-2 mb-3">{p.overview || "暂无概览"}</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setForm({ name: p.name, slug: p.slug, url: p.url, overview: p.overview ?? "", description: p.description ?? "", status: p.status as typeof form.status }); setEditId(p.id); setShow(true); }}
                      className="flex items-center gap-1 text-xs text-[rgba(245,245,240,0.6)] hover:text-[#c9a96e] transition-colors"><Pencil size={13} /> {t("projects.edit")}</button>
                    <a href={`https://${p.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[rgba(245,245,240,0.6)] hover:text-[#c9a96e] transition-colors"><ExternalLink size={13} /> {t("projects.access")}</a>
                    <button onClick={() => { if (confirm(`删除 "${p.name}"？`)) deleteMut.mutate({ id: p.id }); }}
                      className="ml-auto text-xs text-[rgba(245,245,240,0.35)] hover:text-[#f87171] transition-colors">{t("projects.delete")}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
          <div className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]" style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#f5f5f0]">{editId ? t("projects.edit") : t("projects.newProject")}</h2>
              <button onClick={close} className="p-1.5 rounded-lg text-[rgba(245,245,240,0.35)] hover:text-[#f5f5f0] hover:bg-[rgba(255,255,255,0.05)]"><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!validate()) return; editId ? updateMut.mutate({ id: editId, ...form }) : createMut.mutate(form); }} className="space-y-4">
              {[{ k: "name", l: t("projects.name"), p: "Platonic" }, { k: "slug", l: t("projects.slug"), p: "platonic" }, { k: "url", l: t("projects.url"), p: "platonic.corolas.top" }].map(f => (
                <div key={f.k}>
                  <label className="block text-xs font-medium mb-1.5 text-[rgba(245,245,240,0.6)]">{f.l} <span className="text-[#f87171]">*</span></label>
                  <input value={form[f.k as keyof typeof form] as string} onChange={e => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.p}
                    className="w-full h-10 px-3 rounded-md text-sm outline-none bg-[#111] border text-[#f5f5f0] focus:border-[rgba(201,169,110,0.3)] focus:ring-2 focus:ring-[rgba(201,169,110,0.1)] transition-all"
                    style={{ borderColor: errors[f.k] ? "#f87171" : "rgba(255,255,255,0.06)", fontFamily: f.k === "url" ? "monospace" : undefined }} />
                  {errors[f.k] && <p className="text-xs mt-1 text-[#f87171]">{errors[f.k]}</p>}
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[rgba(245,245,240,0.6)]">{t("projects.overview")}</label>
                <textarea value={form.overview} onChange={e => setForm({ ...form, overview: e.target.value })} placeholder="一句话描述..." rows={2}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[rgba(245,245,240,0.6)]">{t("projects.description")}</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="支持 Markdown..." rows={4}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[rgba(245,245,240,0.6)]">{t("projects.status")}</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as typeof form.status })}
                  className="w-full h-10 px-3 rounded-md text-sm outline-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0]">
                  <option value="active">运行中</option><option value="maintenance">维护中</option><option value="development">开发中</option><option value="offline">已下线</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <button type="button" onClick={close} className="px-4 py-2 rounded-lg text-sm text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">{t("projects.cancel")}</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                  className="px-6 py-2 rounded-lg text-sm font-medium bg-[#c9a96e] text-[#050505] hover:brightness-110 disabled:opacity-50 transition-all">{(createMut.isPending || updateMut.isPending) ? "保存中..." : t("projects.save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
