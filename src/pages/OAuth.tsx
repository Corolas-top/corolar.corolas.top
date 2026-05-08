import { useState } from "react";
import { Copy, Check, RefreshCw, AlertCircle } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";

const providers = [
  { id: "kimi", name: "Kimi OAuth", icon: "K" },
  { id: "github", name: "GitHub OAuth", icon: "G" },
  { id: "google", name: "Google OAuth", icon: "g" },
];

export default function OAuth() {
  const utils = trpc.useUtils();
  const { data: configs, isLoading } = trpc.oauth.list.useQuery();
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [,] = useState<Record<string, Record<string, string>>>({});

  const updateMutation = trpc.oauth.update.useMutation({
    onSuccess: () => {
      utils.oauth.list.invalidate();
    },
  });

  const handleToggle = (provider: string, enabled: boolean) => {
    updateMutation.mutate({ provider, enabled });
  };

  const handleTest = async (provider: string) => {
    setTesting(provider);
    try {
      const result = await utils.oauth.testConnection.fetch({ provider });
      setTestResult((prev) => ({ ...prev, [provider]: result }));
    } catch {
      setTestResult((prev) => ({ ...prev, [provider]: { success: false, message: "测试失败" } }));
    }
    setTesting(null);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const getConfig = (provider: string) => {
    return configs?.find((c) => c.provider === provider);
  };

  const maskSecret = (val: string) => {
    if (!val) return "";
    return val.length > 8 ? "••••" + val.slice(-4) : "••••••";
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="OAuth 配置" />

      <div className="flex-1 p-6 max-w-[900px] mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            OAuth 配置
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            管理 Corolas 主站及子项目的第三方登录配置。
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl h-[200px] animate-pulse" style={{ background: "var(--bg-card)" }} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((provider) => {
              const config = getConfig(provider.id);
              const isEnabled = config?.enabled || false;
              const result = testResult[provider.id];

              return (
                <div
                  key={provider.id}
                  className="rounded-xl p-5 transition-all duration-200"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-gold)" }}
                      >
                        {provider.icon}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                          {provider.name}
                        </h3>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {config ? "已配置" : "未配置"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(provider.id, !isEnabled)}
                      className="switch-track transition-colors duration-200"
                      style={{ background: isEnabled ? "var(--text-gold)" : "#374151" }}
                    >
                      <div
                        className="switch-thumb"
                        style={{
                          background: isEnabled ? "#f5f5f0" : "#9CA3AF",
                          transform: isEnabled ? "translateX(24px)" : "translateX(0)",
                        }}
                      />
                    </button>
                  </div>

                  {/* Config Fields */}
                  {isEnabled && config && (
                    <div className="space-y-3 animate-fade-in-up">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Client ID */}
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                            Client ID
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              readOnly
                              value={maskSecret(config.client_id)}
                              className="flex-1 h-9 px-3 rounded-md text-sm"
                              style={{
                                background: "var(--bg-elevated)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-muted)",
                                fontFamily: "monospace",
                              }}
                            />
                            <button
                              onClick={() => copyToClipboard(config.client_id, `${provider.id}-id`)}
                              className="p-2 rounded-md transition-colors duration-150"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {copied === `${provider.id}-id` ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Client Secret */}
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                            Client Secret
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              readOnly
                              value={maskSecret(config.client_secret)}
                              className="flex-1 h-9 px-3 rounded-md text-sm"
                              style={{
                                background: "var(--bg-elevated)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-muted)",
                                fontFamily: "monospace",
                              }}
                            />
                            <button
                              onClick={() => copyToClipboard(config.client_secret, `${provider.id}-secret`)}
                              className="p-2 rounded-md transition-colors duration-150"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {copied === `${provider.id}-secret` ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Callback URL */}
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                          Callback URL
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={config.callback_url}
                            className="flex-1 h-9 px-3 rounded-md text-sm"
                            style={{
                              background: "var(--bg-elevated)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-secondary)",
                              fontFamily: "monospace",
                            }}
                          />
                          <button
                            onClick={() => copyToClipboard(config.callback_url, `${provider.id}-url`)}
                            className="p-2 rounded-md transition-colors duration-150"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {copied === `${provider.id}-url` ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Test Connection */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleTest(provider.id)}
                          disabled={testing === provider.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all duration-150 disabled:opacity-50"
                          style={{
                            borderColor: "var(--border-medium)",
                            color: "var(--text-secondary)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-gold)";
                            e.currentTarget.style.color = "var(--text-gold)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-medium)";
                            e.currentTarget.style.color = "var(--text-secondary)";
                          }}
                        >
                          <RefreshCw size={14} className={testing === provider.id ? "animate-spin" : ""} />
                          {testing === provider.id ? "测试中..." : "测试连接"}
                        </button>

                        {result && (
                          <div
                            className="flex items-center gap-1.5 text-sm animate-fade-in-up"
                            style={{ color: result.success ? "var(--success)" : "var(--error)" }}
                          >
                            {result.success ? <Check size={16} /> : <AlertCircle size={16} />}
                            <span>{result.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!config && (
                    <div
                      className="py-4 px-3 rounded-lg text-center text-sm"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
                    >
                      尚未配置此 OAuth 提供商。请先启用以查看配置选项。
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
