import { useState, useEffect, useRef } from "react";
import { Lock, Plus, Search, Trash2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Topbar from "@/components/Topbar";
import { useLang } from "@/hooks/useLang";

// ---- Chunked AES-256-GCM for unlimited-length encryption ----
const CHUNK_SIZE = 65536; // 64KB per chunk

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}

async function encryptNote(plaintext: string, password: string): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const data = enc.encode(plaintext);
  const chunks: Uint8Array[] = [];
  const ivs: Uint8Array[] = [];
  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, chunk.buffer as ArrayBuffer);
    ivs.push(iv); chunks.push(new Uint8Array(encrypted));
  }
  const numChunks = new Uint8Array(new Uint32Array([chunks.length]).buffer);
  const totalLen = 4 + ivs.length * 12 + chunks.reduce((s, c) => s + c.length, 0);
  const header = new Uint8Array(totalLen);
  let pos = 0;
  header.set(numChunks, pos); pos += 4;
  for (const iv of ivs) { header.set(iv, pos); pos += 12; }
  for (const c of chunks) { header.set(c, pos); pos += c.length; }
  return { ciphertext: btoa(String.fromCharCode(...header)), iv: "chunked", salt: btoa(String.fromCharCode(...salt)) };
}

async function decryptNote(ciphertext: string, _iv: string, saltStr: string, password: string): Promise<string> {
  const salt = Uint8Array.from(atob(saltStr), (c) => c.charCodeAt(0));
  const key = await deriveKey(password, salt);
  const data = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const numChunks = new Uint32Array(data.slice(0, 4).buffer)[0];
  const ivs: Uint8Array[] = [];
  let pos = 4;
  for (let i = 0; i < numChunks; i++) { ivs.push(data.slice(pos, pos + 12)); pos += 12; }
  const decryptedChunks: Uint8Array[] = [];
  for (let i = 0; i < numChunks; i++) {
    const iv = ivs[i];
    const chunkEnd = i === numChunks - 1 ? data.length : pos + CHUNK_SIZE + 16;
    const chunk = data.slice(pos, chunkEnd);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, chunk.buffer as ArrayBuffer);
    decryptedChunks.push(new Uint8Array(decrypted)); pos = chunkEnd;
  }
  const totalLen = decryptedChunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(totalLen);
  let p = 0;
  for (const c of decryptedChunks) { result.set(c, p); p += c.length; }
  return new TextDecoder().decode(result);
}

export default function NotesPage() {
  const { t } = useLang();
  const [notesList, setNotesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [showPwPrompt, setShowPwPrompt] = useState(false);
  const [search, setSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("encrypted_notes").select("id, title, updated_at, created_at").order("updated_at", { ascending: false });
    if (!error) setNotesList(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => { fetchNotes(); }, []);

  const fetchNoteDetail = async (id: number) => {
    const { data, error } = await supabase.from("encrypted_notes").select("*").eq("id", id).single();
    if (!error) setSelectedNote(data);
  };

  useEffect(() => {
    if (selectedNote?.encrypted_content) { setShowPwPrompt(true); }
    else if (selectedNote) { setTitle(selectedNote.title); setContent(""); setShowPwPrompt(false); }
  }, [selectedNote]);

  useEffect(() => {
    if (!dirty || !selectedId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => handleSave(), 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, content, dirty, selectedId]);

  const handleSelectNote = (id: number) => {
    setSelectedId(id);
    setDirty(false);
    fetchNoteDetail(id);
  };

  const handleDecrypt = async () => {
    if (!selectedNote?.encrypted_content || !password) return;
    try {
      const d = await decryptNote(selectedNote.encrypted_content, selectedNote.iv, selectedNote.salt, password);
      const p = JSON.parse(d);
      setTitle(p.title || selectedNote.title);
      setContent(p.content || "");
      setShowPwPrompt(false);
    } catch { alert("解密失败，密码可能不正确"); }
  };

  const handleSave = async () => {
    if (!password) { setShowPwPrompt(true); return; }
    try {
      setSaving(true);
      const d = JSON.stringify({ title, content });
      const { ciphertext, iv, salt } = await encryptNote(d, password);
      if (selectedId) {
        await supabase.from("encrypted_notes").update({ title, encrypted_content: ciphertext, iv, salt, updated_at: new Date().toISOString() }).eq("id", selectedId);
      } else {
        const { data } = await supabase.from("encrypted_notes").insert({ title, encrypted_content: ciphertext, iv, salt }).select().single();
        if (data) setSelectedId(data.id);
      }
      setDirty(false);
      setSaveStatus("已保存");
      setTimeout(() => setSaveStatus(""), 2000);
      fetchNotes();
    } catch (e) { alert("加密失败: " + (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedId || !confirm("删除？")) return;
    await supabase.from("encrypted_notes").delete().eq("id", selectedId);
    setSelectedId(null);
    setSelectedNote(null);
    setTitle("");
    setContent("");
    fetchNotes();
  };

  const handleCreate = () => { setSelectedId(null); setSelectedNote(null); setTitle(""); setContent(""); setDirty(false); if (!password) setShowPwPrompt(true); };
  const filtered = notesList.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="notes.title" />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[280px] flex-shrink-0 flex flex-col bg-[#0a0a0a] border-r border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <h3 className="text-sm font-semibold text-[#f5f5f0]">{t("notes.title")}</h3>
            <button onClick={handleCreate} className="p-1.5 rounded-lg text-[#c9a96e] hover:bg-[rgba(201,169,110,0.1)] transition-colors"><Plus size={18} /></button>
          </div>
          <div className="px-4 py-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(245,245,240,0.35)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("notes.search")} className="w-full h-8 pl-8 pr-3 rounded-md text-xs outline-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0]" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="px-4 py-3 animate-pulse"><div className="h-4 rounded mb-2 bg-[#111] w-[70%]" /><div className="h-3 rounded bg-[#111] w-[40%]" /></div>) :
             filtered.length === 0 ? <div className="text-center py-8 text-xs text-[rgba(245,245,240,0.35)]">暂无笔记</div> :
             filtered.map(n => (
               <button key={n.id} onClick={() => handleSelectNote(n.id)} className={`w-full text-left px-4 py-3 transition-colors relative border-b border-[rgba(255,255,255,0.06)] ${selectedId === n.id ? "bg-[rgba(255,255,255,0.03)]" : ""}`}>
                 {selectedId === n.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#c9a96e] rounded-r" />}
                 <p className="text-sm font-medium text-[#f5f5f0] truncate">{n.title}</p>
                 <p className="text-xs text-[rgba(245,245,240,0.35)] mt-0.5">{n.updated_at ? new Date(n.updated_at).toLocaleDateString("zh-CN") : ""}</p>
               </button>
             ))}
          </div>
          <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-1.5">
            <Lock size={12} className="text-[rgba(245,245,240,0.35)]" />
            <span className="text-[11px] text-[rgba(245,245,240,0.35)]">{t("notes.endToEnd")}</span>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col bg-[#050505]">
          <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <input value={title} onChange={e => { setTitle(e.target.value); setDirty(true); }} placeholder={t("notes.noTitle")} className="text-lg font-medium bg-transparent outline-none flex-1 text-[#f5f5f0]" />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#c9a96e]" title={t("notes.encrypted")}><Lock size={12} /><span>{t("notes.encrypted")}</span></div>
              <button onClick={handleSave} disabled={saving} className="p-2 rounded-lg text-[rgba(245,245,240,0.6)] hover:text-[#c9a96e] hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"><Save size={16} /></button>
              {selectedId && <button onClick={handleDelete} className="p-2 rounded-lg text-[rgba(245,245,240,0.6)] hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors"><Trash2 size={16} /></button>}
              {saveStatus && <span className="text-xs animate-fade-in-up text-[rgba(245,245,240,0.35)]">{saveStatus}</span>}
            </div>
          </div>

          {/* ASCII Warning */}
          <div className="px-6 py-2 bg-[rgba(251,191,36,0.08)] border-b border-[rgba(251,191,36,0.15)]">
            <p className="text-xs text-[#fbbf24] flex items-center gap-1.5">
              <span className="font-bold">!</span>
              {t("notes.warning")}
            </p>
          </div>

          {/* Password Prompt */}
          {showPwPrompt && (
            <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
              <div className="w-full max-w-sm rounded-xl p-6 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-2 mb-4">
                  <Lock size={20} className="text-[#c9a96e]" />
                  <h3 className="text-base font-semibold text-[#f5f5f0]">{selectedNote ? t("notes.decrypt") : t("notes.setKey")}</h3>
                </div>
                <p className="text-sm mb-4 text-[rgba(245,245,240,0.6)]">{selectedNote ? t("notes.decryptDesc") : t("notes.keyDesc")}</p>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("notes.enterKey")} className="w-full h-10 px-3 rounded-md text-sm outline-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0] font-mono mb-4" onKeyDown={e => { if (e.key === "Enter") { if (selectedNote) handleDecrypt(); else setShowPwPrompt(false); } }} />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowPwPrompt(false)} className="px-4 py-2 rounded-lg text-sm text-[rgba(245,245,240,0.6)]">{t("notes.cancel")}</button>
                  <button onClick={() => { if (selectedNote) handleDecrypt(); else setShowPwPrompt(false); }} disabled={!password} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#c9a96e] text-[#050505] hover:brightness-110 disabled:opacity-50">{selectedNote ? t("notes.decrypt") : t("notes.confirm")}</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <textarea value={content} onChange={e => { setContent(e.target.value); setDirty(true); }} placeholder="Write your encrypted note here (English + numbers only)..." className="w-full h-full p-6 text-sm leading-relaxed bg-transparent outline-none resize-none text-[#f5f5f0] font-mono" />
          </div>
        </div>
      </div>
    </div>
  );
}
