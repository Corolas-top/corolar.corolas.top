import { Routes, Route, Navigate } from "react-router";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import Users from "@/pages/Users";
import OAuthPage from "@/pages/OAuth";
import AgentPage from "@/pages/Agent";
import CanvasPage from "@/pages/Canvas";
import NotesPage from "@/pages/Notes";
import Layout from "@/components/Layout";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/users" element={<Users />} />
        <Route path="/oauth" element={<OAuthPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/notes" element={<NotesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
