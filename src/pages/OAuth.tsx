import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Topbar from "@/components/Topbar";

const providers = [
  { id: "kimi", name: "Kimi OAuth" },
  { id: "github", name: "GitHub OAuth" },
  { id: "google", name: "Google OAuth" },
];

export default function OAuthPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchConfigs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("oauth_configs").select("*");
    if (!error) setConfigs(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => { fetchConfigs(); }, []);

  const toggleEnabled = async (provider: string, current: boolean) => {
    await supabase.from("oauth_configs").update({ enabled: !current, updated_at: new Date().toISOString() }).eq("provider", provider);
    fetchConfigs();
  };

  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };
  const mask = (v: string) => v ? (v.length > 8 ? "\u2022\u2022\u2022\u2022" + v.slice(-4) : "\u2022\u2022\u2022\u2022\u2022\u2022") : "";
  const getConfig = (p: string) => configs?.find(c => c.provider === p);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="OAuth 配置" />
      <div className="flex-1 p-6 max-w-[900px] mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#f5f5f0] mb-2">OAuth 配置</h1>
          <p className="text-sm text-[rgba(245,245,240,0.6)]">管理 Corolas 主站及子项目的第三方登录配置。</p>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl p-5 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#111]" />
                  <div className="flex-1"><div className="h-4 bg-[#111] rounded w-24 mb-2" /><div className="h-3 bg-[#111] rounded w-16" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map(p => {
              const c = getConfig(p.id);
              const enabled = c?.enabled || false;
              return (
                <div key={p.id} className="rounded-xl p-5 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold bg-[#111] text-[#c9a96e]">{p.id.charAt(0).toUpperCase()}</div>
                      <div><h3 className="text-base font-semibold text-[#f5f5f0]">{p.name}</h3><p className="text-xs text-[rgba(245,245,240,0.35)]">{c ? "已配置" : "未配置"}</p></div>
                    </div>
                    <button onClick={() => toggleEnabled(p.id, enabled)}
                      className="relative w-12 h-6 rounded-full transition-colors"
                      style={{ background: enabled ? "#c9a96e" : "#374151" }}>
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform" style={{ background: enabled ? "#f5f5f0" : "#9CA3AF", transform: enabled ? "translateX(24px)" : "translateX(0)" }} />
                    </button>
                  </div>
                  {enabled && c && (
                    <div className="space-y-3 animate-fade-in-up">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[{f:"client_id",l:"Client ID"},{f:"client_secret",l:"Client Secret"}].map(({f,l}) => (
                          <div key={f}>
                            <label className="block text-xs font-medium mb-1 text-[rgba(245,245,240,0.6)]">{l}</label>
                            <div className="flex items-center gap-2">
                              <input readOnly value={mask(c[f])} className="flex-1 h-9 px-3 rounded-md text-sm bg-[#111] border border-[rgba(255,255,255,0.06)] text-[rgba(245,245,240,0.35)] font-mono" />
                              <button onClick={() => copy(c[f], `${p.id}-${f}`)} className="p-2 rounded-md text-[rgba(245,245,240,0.6)] transition-colors">{copied === `${p.id}-${f}` ? <Check size={14} /> : <Copy size={14} />}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-[rgba(245,245,240,0.6)]">Callback URL</label>
                        <div className="flex items-center gap-2">
                          <input readOnly value={c.callback_url || ""} className="flex-1 h-9 px-3 rounded-md text-sm bg-[#111] border border-[rgba(255,255,255,0.06)] text-[rgba(245,245,240,0.6)] font-mono" />
                          <button onClick={() => copy(c.callback_url, `${p.id}-url`)} className="p-2 rounded-md text-[rgba(245,245,240,0.6)] transition-colors">{copied === `${p.id}-url` ? <Check size={14} /> : <Copy size={14} />}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
