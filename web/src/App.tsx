import { UserProvider, useUser } from "./lib/context/user";
import { Routes, Route, Navigate } from "react-router";
import { Dashboard, Login, Scene } from "./pages/index.ts";

function AppContent() {
  const { current, isLoading } = useUser();

  if (isLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <Routes>
      {!current ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </>
      ) : (
        <>
          <Route path="/login" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scene/:id" element={<Scene />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </>
      )}
      Home
    </Routes>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
