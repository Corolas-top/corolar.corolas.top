import { useState, useEffect } from "react";
import { Activity, CheckCircle, AlertTriangle, XCircle, Server, Database, Globe, Clock } from "lucide-react";
import Topbar from "@/components/Topbar";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down" | "maintenance";
  uptime: string;
  responseTime: string;
  lastChecked: string;
  icon: React.ElementType;
}

const services: ServiceStatus[] = [
  { name: "www.corolas.top", status: "operational", uptime: "99.98%", responseTime: "142ms", lastChecked: "Just now", icon: Globe },
  { name: "corolar.corolas.top", status: "operational", uptime: "99.95%", responseTime: "189ms", lastChecked: "Just now", icon: Server },
  { name: "platonic.corolas.top", status: "operational", uptime: "99.92%", responseTime: "234ms", lastChecked: "Just now", icon: Globe },
  { name: "edurola.corolas.top", status: "degraded", uptime: "98.5%", responseTime: "1.2s", lastChecked: "2 min ago", icon: Globe },
  { name: "corater.corolas.top", status: "maintenance", uptime: "N/A", responseTime: "—", lastChecked: "1 hour ago", icon: Server },
  { name: "Supabase Database", status: "operational", uptime: "99.99%", responseTime: "45ms", lastChecked: "Just now", icon: Database },
];

const statusConfig = {
  operational: { color: "#4ade80", bg: "rgba(74,222,128,0.1)", icon: CheckCircle, label: "Operational" },
  degraded: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", icon: AlertTriangle, label: "Degraded" },
  down: { color: "#f87171", bg: "rgba(248,113,113,0.1)", icon: XCircle, label: "Down" },
  maintenance: { color: "#60a5fa", bg: "rgba(96,165,250,0.1)", icon: Clock, label: "Maintenance" },
};

export default function StatusPage() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setIsRefreshing(false);
    }, 1500);
  };

  useEffect(() => {
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, []);

  const operational = services.filter((s) => s.status === "operational").length;
  const degraded = services.filter((s) => s.status === "degraded").length;
  const down = services.filter((s) => s.status === "down").length;
  const maintenance = services.filter((s) => s.status === "maintenance").length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="nav.status" subtitle="System Status Monitor" />
      <div className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Operational", value: operational, color: "#4ade80" },
            { label: "Degraded", value: degraded, color: "#fbbf24" },
            { label: "Down", value: down, color: "#f87171" },
            { label: "Maintenance", value: maintenance, color: "#60a5fa" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-5 bg-[#0a0a0a] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: stat.color }} />
                <span className="text-xs text-white/50">{stat.label}</span>
              </div>
              <div className="text-3xl font-light text-[#f5f5f0]">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Services */}
        <div className="rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/[0.06] mb-6">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#f5f5f0]">Services</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/35">Last refresh: {lastRefresh.toLocaleTimeString()}</span>
              <button
                onClick={refresh}
                className={`p-2 rounded-lg text-white/50 hover:bg-white/5 transition-all ${isRefreshing ? "animate-spin" : ""}`}
              >
                <Activity size={14} />
              </button>
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {services.map((service) => {
              const config = statusConfig[service.status];
              const StatusIcon = config.icon;
              const ServiceIcon = service.icon;
              return (
                <div key={service.name} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <ServiceIcon size={18} className="text-white/40" />
                    <div>
                      <p className="text-sm font-medium text-[#f5f5f0]">{service.name}</p>
                      <p className="text-xs text-white/35">{service.lastChecked}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-white/50">Uptime</p>
                      <p className="text-sm font-mono text-[#f5f5f0]">{service.uptime}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-white/50">Response</p>
                      <p className="text-sm font-mono text-[#f5f5f0]">{service.responseTime}</p>
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ background: config.bg, color: config.color }}
                    >
                      <StatusIcon size={12} />
                      {config.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incident History */}
        <div className="rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/[0.06]">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-medium text-[#f5f5f0]">Recent Incidents</h3>
          </div>
          <div className="p-5">
            <div className="flex items-start gap-3 pb-4 border-b border-white/[0.04]">
              <div className="w-2 h-2 rounded-full bg-[#fbbf24] mt-1.5" />
              <div>
                <p className="text-sm text-[#f5f5f0]">edurola.corolas.top response time elevated</p>
                <p className="text-xs text-white/35 mt-1">2026-05-17 14:23 — Degraded performance detected. Investigating.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pt-4">
              <div className="w-2 h-2 rounded-full bg-[#60a5fa] mt-1.5" />
              <div>
                <p className="text-sm text-[#f5f5f0]">corater.corolas.top scheduled maintenance</p>
                <p className="text-xs text-white/35 mt-1">2026-05-17 13:00 — Platform upgrade in progress. ETA: 2 hours.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
