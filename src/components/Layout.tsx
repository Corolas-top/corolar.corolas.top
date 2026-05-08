import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  useEffect(() => {
    const handle = () => {
      setSidebarCollapsed(localStorage.getItem("sidebar_collapsed") === "true");
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg-primary)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <main
        className="flex-1 flex flex-col overflow-hidden transition-all duration-200"
        style={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
      >
        <Outlet />
      </main>
    </div>
  );
}
