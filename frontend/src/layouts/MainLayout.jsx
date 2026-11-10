
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    FolderKanban,
    ClipboardList,
    Flag,
    CalendarDays,
    Boxes,
    Wallet,
    FileBarChart,
    Users,
    LogOut
} from "lucide-react";

function MainLayout() {
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const navigation = [
        { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { name: "Projects", path: "/projects", icon: FolderKanban },
        { name: "Tasks", path: "/tasks", icon: ClipboardList },
        { name: "Milestones", path: "/milestones", icon: Flag },
        { name: "Daily Progress", path: "/daily-progress", icon: CalendarDays },
        { name: "Resources", path: "/resources", icon: Boxes },
        { name: "Cost Management", path: "/cost-management", icon: Wallet },
        { name: "Reports", path: "/reports", icon: FileBarChart },
        { name: "User Management", path: "/users", icon: Users }
    ];

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    };

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="brand">
                    <span>🏗️</span>
                    <h2>ConstructPro</h2>
                </div>

                <p className="sidebar-label">MAIN MENU</p>

                <nav className="sidebar-nav">
                    {navigation.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                to={item.path}
                                key={item.path}
                                className={({ isActive }) =>
                                    isActive ? "nav-link active" : "nav-link"
                                }
                            >
                                <Icon size={19} />
                                <span>{item.name}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="sidebar-bottom">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                            <strong>{user.fullName || "User"}</strong>
                            <p>{user.role || "Team Member"}</p>
                        </div>
                    </div>

                    <button className="logout-button" onClick={handleLogout}>
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside>

            <main className="main-area">
                <header className="topbar">
                    <span>Construction Project Management</span>
                    <span>{user.role || "Team Member"}</span>
                </header>

                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default MainLayout;
