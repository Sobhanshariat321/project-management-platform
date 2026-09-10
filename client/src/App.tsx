import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell, Protected } from "./components/layout/AppShell.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Workspaces from "./pages/Workspaces.tsx";
import Projects from "./pages/Projects.tsx";
import ProjectBoard from "./pages/ProjectBoard.tsx";
import TasksPage from "./pages/Tasks.tsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/workspaces" element={<Protected><Workspaces /></Protected>} />
        <Route path="/projects" element={<Protected><Projects /></Protected>} />
        <Route path="/projects/:id" element={<Protected><ProjectBoard /></Protected>} />
        <Route path="/tasks" element={<Protected><TasksPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
