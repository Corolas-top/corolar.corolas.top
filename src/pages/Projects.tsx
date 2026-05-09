import { useState, useEffect } from "react";
import { Plus, Pencil, ExternalLink, X, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Topbar from "@/components/Topbar";
import { useLang } from "@/hooks/useLang";

const statusMap: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(74,222,128,0.1)", text: "#4ade80", label: "运行中" },
  maintenance: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", label: "维护中" },
  development: { bg: "rgba(96,165,250,0.1)", text: "#60a5fa", label: "开发中" },
  offline: { bg: "rgba(248,113,113,0.1)", text: "#f87171", label: "已下线" },
};

const emptyForm = { name: "", slug: "", url: "", overview: "", description: "", status: "development" as const };

function genId(): string {
  return "cpid_" + Array.from({ length: 12 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]).join("") + Date.now().toString(36);
}

export default function Projects() {
  const { t } = useLang();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("projects").select("*").order("sort_order", { ascending: true });
    if (!error) setProjects(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const close = () => { setShow(false); setEditId(null); setForm(emptyForm); setErrors({}); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "\u5fc5\u586b";
    if (!form.slug.trim()) e.slug = "\u5fc5\u586b";
    if (!form.url.trim()) e.url = "\u5fc5\u586b";
    else if (!/^(?!https?:\/\/)([a-z0-9-]+\.)+[a-z]{2,}$/i.test(form.url)) e.url = "\u65e0\u6548\u57df\u540d";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    if (editId) {
      const { error } = await supabase.from("projects").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editId);
      if (!error) { await fetchProjects(); close(); }
    } else {
      const { error } = await supabase.from("projects").insert({ ...form, corolas_project_id: genId() });
      if (!error) { await fetchProjects(); close(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("\u5220\u9664\uff1f")) return;
    await supabase.from("projects").delete().eq("id", id);
    await fetchProjects();
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

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] animate-pulse">
                <div className="h-[120px] bg-[#111]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-[#111] rounded w-1/2" />
                  <div className="h-3 bg-[#111] rounded w-3/4" />
                  <div className="h-3 bg-[#111] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => {
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
                    {p.corolas_project_id && (
                      <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded bg-[#111] border border-[rgba(255,255,255,0.06)]">
                        <span className="text-[10px] text-[rgba(245,245,240,0.35)]">CPID:</span>
                        <span className="text-xs text-[rgba(245,245,240,0.6)] font-mono truncate">{p.corolas_project_id}</span>
                        <button onClick={() => copyId(p.corolas_project_id)} className="ml-auto text-[rgba(245,245,240,0.35)] hover:text-[#c9a96e] transition-colors">
                          {copiedId === p.corolas_project_id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-[rgba(245,245,240,0.6)] line-clamp-2 mb-3">{p.overview || "\u6682\u65e0\u6982\u89c8"}</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setForm({ name: p.name, slug: p.slug, url: p.url, overview: p.overview ?? "", description: p.description ?? "", status: p.status }); setEditId(p.id); setShow(true); }}
                        className="flex items-center gap-1 text-xs text-[rgba(245,245,240,0.6)] hover:text-[#c9a96e] transition-colors"><Pencil size={13} /> {t("projects.edit")}</button>
                      <a href={`https://${p.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[rgba(245,245,240,0.6)] hover:text-[#c9a96e] transition-colors"><ExternalLink size={13} /> {t("projects.access")}</a>
                      <button onClick={() => handleDelete(p.id)} className="ml-auto text-xs text-[rgba(245,245,240,0.35)] hover:text-[#f87171] transition-colors">{t("projects.delete")}</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && (
              <div className="col-span-full text-center py-16 text-sm text-[rgba(245,245,240,0.35)] rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
                \u6682\u65e0\u9879\u76ee\uff0c\u70b9\u51fb\u300c\u65b0\u5efa\u9879\u76ee\u300d\u5f00\u59cb
              </div>
            )}
          </div>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
          <div className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]" style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#f5f5f0]">{editId ? t("projects.edit") : t("projects.newProject")}</h2>
              <button onClick={close} className="p-1.5 rounded-lg text-[rgba(245,245,240,0.35)] hover:text-[#f5f5f0] hover:bg-[rgba(255,255,255,0.05)]"><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
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
                <textarea value={form.overview} onChange={e => setForm({ ...form, overview: e.target.value })} placeholder="\u4e00\u53e5\u8bdd\u63cf\u8ff0..." rows={2}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[rgba(245,245,240,0.6)]">{t("projects.description")}</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="\u652f\u6301 Markdown..." rows={4}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[rgba(245,245,240,0.6)]">{t("projects.status")}</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as typeof form.status })}
                  className="w-full h-10 px-3 rounded-md text-sm outline-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0]">
                  <option value="active">\u8fd0\u884c\u4e2d</option><option value="maintenance">\u7ef4\u62a4\u4e2d</option><option value="development">\u5f00\u53d1\u4e2d</option><option value="offline">\u5df2\u4e0b\u7ebf</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <button type="button" onClick={close} className="px-4 py-2 rounded-lg text-sm text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">{t("projects.cancel")}</button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2 rounded-lg text-sm font-medium bg-[#c9a96e] text-[#050505] hover:brightness-110 disabled:opacity-50 transition-all">{saving ? "\u4fdd\u5b58\u4e2d..." : t("projects.save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
