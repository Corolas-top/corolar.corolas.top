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

import Databases from "@/pages/Databases";
import StatusPage from "@/pages/Status";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/users" element={<Users />} />
        <Route path="/databases" element={<Databases />} />
        <Route path="/oauth" element={<OAuthPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/status" element={<StatusPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
