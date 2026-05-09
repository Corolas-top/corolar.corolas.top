import { Outlet, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden ml-60">
        <Outlet />
      </main>
    </div>
  );
}
