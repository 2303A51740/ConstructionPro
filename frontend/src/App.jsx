
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Milestones from "./pages/Milestones";
import DailyProgress from "./pages/DailyProgress";
import Resources from "./pages/Resources";
import CostManagement from "./pages/CostManagement";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";

import MainLayout from "./layouts/MainLayout";

// Check authentication
function ProtectedRoute({ children }) {
    const token = localStorage.getItem("token");

    return token ? children : <Navigate to="/" replace />;
}

// Prevent logged-in users from returning to login
function GuestRoute({ children }) {
    const token = localStorage.getItem("token");

    return token ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Public Login Route */}
                <Route
                    path="/"
                    element={
                        <GuestRoute>
                            <Login />
                        </GuestRoute>
                    }
                />

                {/* Protected Application Routes */}
                <Route
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/dashboard" element={<Dashboard />} />

                    <Route path="/projects" element={<Projects />} />

                    <Route path="/tasks" element={<Tasks />} />

                    <Route path="/milestones" element={<Milestones />} />

                    <Route
                        path="/daily-progress"
                        element={<DailyProgress />}
                    />

                    <Route path="/resources" element={<Resources />} />

                    <Route
                        path="/cost-management"
                        element={<CostManagement />}
                    />

                    <Route path="/reports" element={<Reports />} />

                    <Route path="/users" element={<UserManagement />} />
                </Route>

                {/* Invalid Routes */}
                <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
