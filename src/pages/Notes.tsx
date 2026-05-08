import { useState, useEffect, useRef } from "react";
import { Lock, Plus, Search, Trash2, Save } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";

// Client-side encryption helpers
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (crypto.subtle.deriveKey as any)(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptNote(content: string, password: string): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt as Uint8Array);
  const encoder = new TextEncoder();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ciphertext = await (crypto.subtle.encrypt as any)(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(content)
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...(iv as Uint8Array))),
    salt: btoa(String.fromCharCode(...(salt as Uint8Array))),
  };
}

async function decryptNote(ciphertext: string, iv: string, salt: string, password: string): Promise<string> {
  const saltBuf = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));
  const key = await deriveKey(password, saltBuf);
  const ivBuf = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const cipherBuf = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decrypted = await (crypto.subtle.decrypt as any)(
    { name: "AES-GCM", iv: ivBuf },
    key,
    cipherBuf
  );
  return new TextDecoder().decode(decrypted);
}

export default function Notes() {
  const utils = trpc.useUtils();
  const { data: notesList, isLoading } = trpc.notes.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [search, setSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: selectedNote } = trpc.notes.getById.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  const createMutation = trpc.notes.create.useMutation({
    onSuccess: (data) => {
      utils.notes.list.invalidate();
      setSelectedId(data.id);
      setSaveStatus("已创建");
      setTimeout(() => setSaveStatus(""), 2000);
    },
  });

  const updateMutation = trpc.notes.update.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      setSaveStatus("已保存");
      setTimeout(() => setSaveStatus(""), 2000);
      setIsDirty(false);
    },
  });

  const deleteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      setSelectedId(null);
      setTitle("");
      setContent("");
    },
  });

  // Load note content
  useEffect(() => {
    if (selectedNote?.encrypted_content) {
      setShowPasswordPrompt(true);
    } else if (selectedNote) {
      setTitle(selectedNote.title);
      setContent("");
      setShowPasswordPrompt(false);
    }
  }, [selectedNote]);

  // Auto-save
  useEffect(() => {
    if (!isDirty || !selectedId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, content, isDirty, selectedId]);

  const handleDecrypt = async () => {
    if (!selectedNote?.encrypted_content || !password) return;
    try {
      const decrypted = await decryptNote(
        selectedNote.encrypted_content,
        selectedNote.iv,
        selectedNote.salt,
        password
      );
      const parsed = JSON.parse(decrypted);
      setTitle(parsed.title || selectedNote.title);
      setContent(parsed.content || "");
      setShowPasswordPrompt(false);
    } catch {
      alert("解密失败，密码可能不正确");
    }
  };

  const handleSave = async () => {
    if (!password) {
      setShowPasswordPrompt(true);
      return;
    }
    const data = JSON.stringify({ title, content });
    const { ciphertext, iv, salt } = await encryptNote(data, password);

    if (selectedId) {
      updateMutation.mutate({ id: selectedId, title, encrypted_content: ciphertext, iv, salt });
    } else {
      createMutation.mutate({ title, encrypted_content: ciphertext, iv, salt });
    }
  };

  const handleCreate = () => {
    setSelectedId(null);
    setTitle("");
    setContent("");
    setIsDirty(false);
    if (!password) setShowPasswordPrompt(true);
  };

  const handleDelete = () => {
    if (selectedId && confirm("删除此笔记？")) {
      deleteMutation.mutate({ id: selectedId });
    }
  };

  const filteredNotes = (notesList || []).filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="加密笔记" />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Note List */}
        <div
          className="w-[280px] flex-shrink-0 flex flex-col border-r"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              加密笔记
            </h3>
            <button
              onClick={handleCreate}
              className="p-1.5 rounded-lg transition-colors duration-150"
              style={{ color: "var(--text-gold)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(201,169,110,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索笔记..."
                className="w-full h-8 pl-8 pr-3 rounded-md text-xs outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 animate-pulse">
                  <div className="h-4 rounded mb-2" style={{ background: "var(--bg-elevated)", width: "70%" }} />
                  <div className="h-3 rounded" style={{ background: "var(--bg-elevated)", width: "40%" }} />
                </div>
              ))
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
                暂无笔记
              </div>
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setSelectedId(note.id);
                    setIsDirty(false);
                  }}
                  className="w-full text-left px-4 py-3 transition-colors duration-150 relative"
                  style={{
                    background: selectedId === note.id ? "rgba(255,255,255,0.03)" : "transparent",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  {selectedId === note.id && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                      style={{ background: "var(--text-gold)" }}
                    />
                  )}
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {note.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {note.updated_at ? new Date(note.updated_at).toLocaleDateString("zh-CN") : ""}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2 border-t flex items-center gap-1.5"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <Lock size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              所有笔记在本地加密后存储
            </span>
          </div>
        </div>

        {/* Right: Editor */}
        <div className="flex-1 flex flex-col" style={{ background: "var(--bg-primary)" }}>
          {/* Toolbar */}
          <div
            className="flex items-center justify-between px-6 py-3 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="无标题笔记"
              className="text-lg font-medium bg-transparent outline-none flex-1"
              style={{ color: "var(--text-primary)" }}
            />
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ color: "var(--text-gold)" }}
                title="此笔记已端到端加密"
              >
                <Lock size={12} />
                <span>已加密</span>
              </div>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || createMutation.isPending}
                className="p-2 rounded-lg transition-colors duration-150 disabled:opacity-50"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-gold)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <Save size={16} />
              </button>
              {selectedId && (
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg transition-colors duration-150"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(248,113,113,0.1)";
                    e.currentTarget.style.color = "var(--error)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
              {saveStatus && (
                <span className="text-xs animate-fade-in-up" style={{ color: "var(--text-muted)" }}>
                  {saveStatus}
                </span>
              )}
            </div>
          </div>

          {/* Password Prompt */}
          {showPasswordPrompt && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.7)" }}
            >
              <div
                className="w-full max-w-sm rounded-xl p-6"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Lock size={20} style={{ color: "var(--text-gold)" }} />
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selectedNote ? "解密笔记" : "设置加密密码"}
                  </h3>
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                  {selectedNote
                    ? "请输入笔记的加密密码以查看内容"
                    : "请设置一个密码用于加密此笔记。请牢记此密码，无法找回。"}
                </p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码..."
                  className="w-full h-10 px-3 rounded-md text-sm outline-none mb-4"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (selectedNote) handleDecrypt();
                      else setShowPasswordPrompt(false);
                    }
                  }}
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowPasswordPrompt(false)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      if (selectedNote) handleDecrypt();
                      else setShowPasswordPrompt(false);
                    }}
                    disabled={!password}
                    className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ background: "var(--text-gold)", color: "var(--bg-primary)" }}
                  >
                    {selectedNote ? "解密" : "确认"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setIsDirty(true);
              }}
              placeholder="开始编写你的加密笔记..."
              className="w-full h-full p-6 text-sm leading-relaxed bg-transparent outline-none resize-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
