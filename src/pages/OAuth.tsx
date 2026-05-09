import { useState } from "react";
import { Copy, Check, RefreshCw, AlertCircle } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";

const providers = [
  { id: "kimi", name: "Kimi OAuth" },
  { id: "github", name: "GitHub OAuth" },
  { id: "google", name: "Google OAuth" },
];

export default function OAuthPage() {
  const utils = trpc.useUtils();
  const { data: configs } = trpc.oauth.list.useQuery();
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const updateMut = trpc.oauth.update.useMutation({ onSuccess: () => utils.oauth.list.invalidate() });

  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };
  const mask = (v: string) => v ? (v.length > 8 ? "\u2022\u2022\u2022\u2022" + v.slice(-4) : "\u2022\u2022\u2022\u2022\u2022\u2022") : "";
  const getConfig = (p: string) => configs?.find(c => c.provider === p);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="OAuth 配置" />
      <div className="flex-1 p-6 max-w-[900px] mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-coro-text-primary mb-2">OAuth 配置</h1>
          <p className="text-sm text-coro-text-secondary">管理 Corolas 主站及子项目的第三方登录配置。</p>
        </div>
        <div className="space-y-4">
          {providers.map(p => {
            const c = getConfig(p.id);
            const enabled = c?.enabled || false;
            return (
              <div key={p.id} className="rounded-xl p-5 bg-coro-card border border-coro-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold bg-coro-elevated text-coro-gold">{p.id.charAt(0).toUpperCase()}</div>
                    <div>
                      <h3 className="text-base font-semibold text-coro-text-primary">{p.name}</h3>
                      <p className="text-xs text-coro-text-muted">{c ? "已配置" : "未配置"}</p>
                    </div>
                  </div>
                  <button onClick={() => updateMut.mutate({ provider: p.id, enabled: !enabled })}
                    className="switch-track" style={{ background: enabled ? "#c9a96e" : "#374151" }}>
                    <div className="switch-thumb" style={{ background: enabled ? "#f5f5f0" : "#9CA3AF", transform: enabled ? "translateX(24px)" : "translateX(0)" }} />
                  </button>
                </div>
                {enabled && c && (
                  <div className="space-y-3 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {["client_id", "client_secret"].map(field => (
                        <div key={field}>
                          <label className="block text-xs font-medium mb-1 text-coro-text-secondary">{field === "client_id" ? "Client ID" : "Client Secret"}</label>
                          <div className="flex items-center gap-2">
                            <input readOnly value={mask(c[field as keyof typeof c] as string)} className="flex-1 h-9 px-3 rounded-md text-sm bg-coro-elevated border border-coro-border text-coro-text-muted font-mono" />
                            <button onClick={() => copy(c[field as keyof typeof c] as string, `${p.id}-${field}`)} className="p-2 rounded-md text-coro-text-secondary transition-colors">
                              {copied === `${p.id}-${field}` ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-coro-text-secondary">Callback URL</label>
                      <div className="flex items-center gap-2">
                        <input readOnly value={c.callback_url} className="flex-1 h-9 px-3 rounded-md text-sm bg-coro-elevated border border-coro-border text-coro-text-secondary font-mono" />
                        <button onClick={() => copy(c.callback_url, `${p.id}-url`)} className="p-2 rounded-md text-coro-text-secondary transition-colors">
                          {copied === `${p.id}-url` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button onClick={async () => { setTesting(p.id); try { const r = await utils.oauth.testConnection.fetch({ provider: p.id }); setTestResult(prev => ({ ...prev, [p.id]: r })); } catch { setTestResult(prev => ({ ...prev, [p.id]: { success: false, message: "Failed" } })); } setTesting(null); }}
                        disabled={testing === p.id} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-coro-border-medium text-coro-text-secondary hover:border-coro-gold-30 hover:text-coro-gold transition-all disabled:opacity-50">
                        <RefreshCw size={14} className={testing === p.id ? "animate-spin" : ""} /> {testing === p.id ? "测试中..." : "测试连接"}
                      </button>
                      {testResult[p.id] && (
                        <div className="flex items-center gap-1.5 text-sm animate-fade-in-up" style={{ color: testResult[p.id].success ? "#4ade80" : "#f87171" }}>
                          {testResult[p.id].success ? <Check size={16} /> : <AlertCircle size={16} />}<span>{testResult[p.id].message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
