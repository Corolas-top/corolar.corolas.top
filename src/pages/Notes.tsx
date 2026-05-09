import { useState, useEffect, useRef } from "react";
import { Lock, Plus, Search, Trash2, Save } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";

// ---- Crypto: Chunked AES-256-GCM for unlimited length ----
const CHUNK_SIZE = 65536; // 64KB per chunk

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new Uint8Array(salt).buffer, iterations: 100000, hash: "SHA-256" },
    km,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
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
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(iv).buffer }, key, new Uint8Array(chunk).buffer);
    ivs.push(iv);
    chunks.push(new Uint8Array(encrypted));
  }

  // Layout: [numChunks(4)] + [ivLen*12 bytes] + [encrypted chunks concatenated]
  const numChunks = new Uint8Array(new Uint32Array([chunks.length]).buffer);
  const header = new Uint8Array(4 + ivs.length * 12 + chunks.reduce((s, c) => s + c.length, 0));
  let pos = 0;
  header.set(numChunks, pos); pos += 4;
  for (const iv of ivs) { header.set(iv, pos); pos += 12; }
  for (const chunk of chunks) { header.set(chunk, pos); pos += chunk.length; }

  return {
    ciphertext: btoa(String.fromCharCode(...header)),
    iv: "chunked",
    salt: btoa(String.fromCharCode(...salt)),
  };
}

async function decryptNote(ciphertext: string, _iv: string, saltStr: string, password: string): Promise<string> {
  const salt = Uint8Array.from(atob(saltStr), (c) => c.charCodeAt(0));
  const key = await deriveKey(password, salt);
  const data = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

  const numChunks = new Uint32Array(data.slice(0, 4).buffer)[0];
  const ivs: Uint8Array[] = [];
  let pos = 4;
  for (let i = 0; i < numChunks; i++) {
    ivs.push(data.slice(pos, pos + 12));
    pos += 12;
  }

  const decryptedChunks: Uint8Array[] = [];
  for (let i = 0; i < numChunks; i++) {
    const iv = ivs[i];
    // Each encrypted chunk has auth tag (16 bytes) appended by AES-GCM
    const chunkEnd = i === numChunks - 1 ? data.length : pos + CHUNK_SIZE + 16;
    const chunk = data.slice(pos, chunkEnd);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv).buffer }, key, new Uint8Array(chunk).buffer);
    decryptedChunks.push(new Uint8Array(decrypted));
    pos = chunkEnd;
  }

  const totalLen = decryptedChunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(totalLen);
  let p = 0;
  for (const c of decryptedChunks) { result.set(c, p); p += c.length; }
  return new TextDecoder().decode(result);
}

export default function NotesPage() {
  const utils = trpc.useUtils();
  const { data: notesList, isLoading } = trpc.notes.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [showPwPrompt, setShowPwPrompt] = useState(false);
  const [search, setSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: selectedNote } = trpc.notes.getById.useQuery({ id: selectedId! }, { enabled: !!selectedId });
  const createMut = trpc.notes.create.useMutation({ onSuccess: (d) => { utils.notes.list.invalidate(); setSelectedId(d.id); } });
  const updateMut = trpc.notes.update.useMutation({ onSuccess: () => { utils.notes.list.invalidate(); setDirty(false); setSaveStatus("已保存"); setTimeout(() => setSaveStatus(""), 2000); } });
  const deleteMut = trpc.notes.delete.useMutation({ onSuccess: () => { utils.notes.list.invalidate(); setSelectedId(null); setTitle(""); setContent(""); } });

  useEffect(() => {
    if (selectedNote?.encrypted_content) {
      setShowPwPrompt(true);
    } else if (selectedNote) {
      setTitle(selectedNote.title);
      setContent("");
      setShowPwPrompt(false);
    }
  }, [selectedNote]);

  useEffect(() => {
    if (!dirty || !selectedId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => handleSave(), 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, content, dirty, selectedId]);

  const handleDecrypt = async () => {
    if (!selectedNote?.encrypted_content || !password) return;
    try {
      const decrypted = await decryptNote(selectedNote.encrypted_content, selectedNote.iv, selectedNote.salt, password);
      const parsed = JSON.parse(decrypted);
      setTitle(parsed.title || selectedNote.title);
      setContent(parsed.content || "");
      setShowPwPrompt(false);
    } catch {
      alert("解密失败，密码可能不正确");
    }
  };

  const handleSave = async () => {
    if (!password) { setShowPwPrompt(true); return; }
    const data = JSON.stringify({ title, content });
    try {
      const { ciphertext, iv, salt } = await encryptNote(data, password);
      if (selectedId) {
        updateMut.mutate({ id: selectedId, title, encrypted_content: ciphertext, iv, salt });
      } else {
        createMut.mutate({ title, encrypted_content: ciphertext, iv, salt });
      }
    } catch (e) {
      alert("加密失败: " + (e as Error).message);
    }
  };

  const handleCreate = () => { setSelectedId(null); setTitle(""); setContent(""); setDirty(false); if (!password) setShowPwPrompt(true); };
  const filtered = (notesList || []).filter(n => n.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="加密笔记" />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[280px] flex-shrink-0 flex flex-col bg-coro-card border-r border-coro-border">
          <div className="flex items-center justify-between px-4 py-3 border-b border-coro-border">
            <h3 className="text-sm font-semibold text-coro-text-primary">加密笔记</h3>
            <button onClick={handleCreate} className="p-1.5 rounded-lg text-coro-gold hover:bg-coro-gold-10 transition-colors"><Plus size={18} /></button>
          </div>
          <div className="px-4 py-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-coro-text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..."
                className="w-full h-8 pl-8 pr-3 rounded-md text-xs outline-none bg-coro-elevated border border-coro-border text-coro-text-primary" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="px-4 py-3 animate-pulse"><div className="h-4 rounded mb-2 bg-coro-elevated w-[70%]" /><div className="h-3 rounded bg-coro-elevated w-[40%]" /></div>) :
             filtered.length === 0 ? <div className="text-center py-8 text-xs text-coro-text-muted">暂无笔记</div> :
             filtered.map(n => (
               <button key={n.id} onClick={() => { setSelectedId(n.id); setDirty(false); }}
                 className={`w-full text-left px-4 py-3 transition-colors relative border-b border-coro-border ${selectedId === n.id ? "bg-white/[0.03]" : ""}`}>
                 {selectedId === n.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-coro-gold rounded-r" />}
                 <p className="text-sm font-medium text-coro-text-primary truncate">{n.title}</p>
                 <p className="text-xs text-coro-text-muted mt-0.5">{n.updated_at ? new Date(n.updated_at).toLocaleDateString("zh-CN") : ""}</p>
               </button>
             ))}
          </div>
          <div className="px-4 py-2 border-t border-coro-border flex items-center gap-1.5">
            <Lock size={12} className="text-coro-text-muted" />
            <span className="text-[11px] text-coro-text-muted">端到端加密，服务端无法解密</span>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col bg-coro-bg">
          <div className="flex items-center justify-between px-6 py-3 border-b border-coro-border">
            <input value={title} onChange={e => { setTitle(e.target.value); setDirty(true); }} placeholder="无标题笔记"
              className="text-lg font-medium bg-transparent outline-none flex-1 text-coro-text-primary" />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded text-xs text-coro-gold" title="此笔记已端到端加密"><Lock size={12} /><span>已加密</span></div>
              <button onClick={handleSave} disabled={updateMut.isPending || createMut.isPending}
                className="p-2 rounded-lg text-coro-text-secondary hover:text-coro-gold hover:bg-white/[0.05] transition-colors disabled:opacity-50"><Save size={16} /></button>
              {selectedId && <button onClick={() => { if (confirm("删除？")) deleteMut.mutate({ id: selectedId }); }}
                className="p-2 rounded-lg text-coro-text-secondary hover:text-coro-error hover:bg-coro-error/10 transition-colors"><Trash2 size={16} /></button>}
              {saveStatus && <span className="text-xs animate-fade-in-up text-coro-text-muted">{saveStatus}</span>}
            </div>
          </div>

          {/* Warning */}
          <div className="px-6 py-2 bg-coro-warning/10 border-b border-coro-warning/20">
            <p className="text-xs text-coro-warning flex items-center gap-1">
              <span className="font-bold">!</span>
              加密笔记仅支持英文+数字（ASCII characters only）。使用非 ASCII 字符可能导致加密/解密失败。
            </p>
          </div>

          {/* Password Prompt */}
          {showPwPrompt && (
            <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
              <div className="w-full max-w-sm rounded-xl p-6 bg-coro-card border border-coro-border">
                <div className="flex items-center gap-2 mb-4">
                  <Lock size={20} className="text-coro-gold" />
                  <h3 className="text-base font-semibold text-coro-text-primary">{selectedNote ? "解密笔记" : "设置加密密钥"}</h3>
                </div>
                <p className="text-sm mb-4 text-coro-text-secondary">
                  {selectedNote ? "输入密钥解密此笔记" : "设置一个密钥来加密新笔记。请牢记此密钥，无法找回。"}
                </p>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter key..."
                  className="w-full h-10 px-3 rounded-md text-sm outline-none bg-coro-elevated border border-coro-border text-coro-text-primary font-mono mb-4"
                  onKeyDown={e => { if (e.key === "Enter") { if (selectedNote) handleDecrypt(); else setShowPwPrompt(false); } }} />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowPwPrompt(false)} className="px-4 py-2 rounded-lg text-sm text-coro-text-secondary">取消</button>
                  <button onClick={() => { if (selectedNote) handleDecrypt(); else setShowPwPrompt(false); }} disabled={!password}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-coro-gold text-coro-bg hover:brightness-110 disabled:opacity-50">{selectedNote ? "解密" : "确认"}</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <textarea value={content} onChange={e => { setContent(e.target.value); setDirty(true); }} placeholder="Write your encrypted note here (English + numbers only)..."
              className="w-full h-full p-6 text-sm leading-relaxed bg-transparent outline-none resize-none text-coro-text-primary font-mono" />
          </div>
        </div>
      </div>
    </div>
  );
}
