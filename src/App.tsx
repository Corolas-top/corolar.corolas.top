import { Routes, Route, Navigate } from "react-router";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import Users from "@/pages/Users";
import OAuth from "@/pages/OAuth";
import Agent from "@/pages/Agent";
import Canvas from "@/pages/Canvas";
import Notes from "@/pages/Notes";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/users" element={<Users />} />
        <Route path="/oauth" element={<OAuth />} />
        <Route path="/agent" element={<Agent />} />
        <Route path="/canvas" element={<Canvas />} />
        <Route path="/notes" element={<Notes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
