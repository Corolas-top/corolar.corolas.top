import { useState, useEffect } from "react";
import { Database, Table, Key, Shield, AlertCircle, RefreshCw } from "lucide-react";
import Topbar from "@/components/Topbar";

interface TableInfo {
  name: string;
  rows: number | string;
  size: string;
  lastUpdated: string;
}

const mockTables: TableInfo[] = [
  { name: "profiles", rows: 1247, size: "2.4 MB", lastUpdated: "2 min ago" },
  { name: "corolas_accounts", rows: 1247, size: "1.1 MB", lastUpdated: "2 min ago" },
  { name: "oauth_clients", rows: 4, size: "8 KB", lastUpdated: "1 day ago" },
  { name: "oauth_tokens", rows: 89, size: "156 KB", lastUpdated: "5 min ago" },
  { name: "projects", rows: 6, size: "12 KB", lastUpdated: "1 day ago" },
  { name: "payments", rows: 342, size: "512 KB", lastUpdated: "10 min ago" },
  { name: "subscriptions", rows: 89, size: "128 KB", lastUpdated: "15 min ago" },
  { name: "activity_logs", rows: 8934, size: "4.2 MB", lastUpdated: "Just now" },
];

export default function Databases() {
  const [tables, setTables] = useState<TableInfo[]>(mockTables);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const totalSize = tables.reduce((acc, t) => acc + parseFloat(t.size), 0).toFixed(1) + " MB";

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="nav.databases" subtitle="Database Management" />
      <div className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#c9a96e]/10 flex items-center justify-center text-[#c9a96e]">
              <Database size={20} />
            </div>
            <div>
              <h1 className="text-lg font-medium text-[#f5f5f0]">Database Overview</h1>
              <p className="text-xs text-white/35">corolar.corolas.top</p>
            </div>
          </div>
          <button
            onClick={refresh}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 transition-all ${isLoading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Tables", value: tables.length, icon: Table, color: "#c9a96e" },
            { label: "Total Rows", value: tables.reduce((a, t) => a + (typeof t.rows === 'number' ? t.rows : 0), 0).toLocaleString(), icon: Database, color: "#60a5fa" },
            { label: "Total Size", value: totalSize, icon: Shield, color: "#4ade80" },
            { label: "Health", value: "Healthy", icon: AlertCircle, color: "#4ade80" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl p-5 bg-[#0a0a0a] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}1a` }}>
                    <Icon size={18} style={{ color: stat.color }} />
                  </div>
                  <span className="text-xs text-white/50">{stat.label}</span>
                </div>
                <div className="text-2xl font-light text-[#f5f5f0]">{stat.value}</div>
              </div>
            );
          })}
        </div>

        {/* Tables list */}
        <div className="rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/[0.06]">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#f5f5f0]">Tables</h3>
            <span className="text-xs text-white/35">{tables.length} tables</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#111]">
                  {["Table Name", "Rows", "Size", "Last Updated", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-white/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table.name} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Table size={14} className="text-[#c9a96e]" />
                        <span className="text-sm font-mono text-[#f5f5f0]">{table.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-white/60">{typeof table.rows === 'number' ? table.rows.toLocaleString() : table.rows}</td>
                    <td className="px-5 py-3 text-sm text-white/60">{table.size}</td>
                    <td className="px-5 py-3 text-xs text-white/35">{table.lastUpdated}</td>
                    <td className="px-5 py-3">
                      <button className="text-xs text-[#c9a96e] hover:text-[#e0c669] transition-colors flex items-center gap-1">
                        <Key size={12} /> Schema
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
