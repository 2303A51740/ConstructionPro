
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import api from "../services/api";

function Dashboard() {
    const [statistics, setStatistics] = useState(null);
    const [recentProjects, setRecentProjects] = useState([]);
    const [recentTasks, setRecentTasks] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/dashboard");

            setStatistics(response.data.statistics);
            setRecentProjects(response.data.recentProjects || []);
            setRecentTasks(response.data.recentTasks || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load dashboard. Please log in again."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const formatCurrency = (value) =>
        `₹${Number(value || 0).toLocaleString("en-IN")}`;

    const ProgressBar = ({ progress }) => (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: "130px"
        }}>
            <div style={{
                flex: 1,
                height: "8px",
                background: "#e9edf3",
                borderRadius: "10px",
                overflow: "hidden"
            }}>
                <div style={{
                    width: `${Math.min(100, Math.max(0, Number(progress) || 0))}%`,
                    height: "100%",
                    background: "#e99b35",
                    borderRadius: "10px",
                    transition: "width 0.3s ease"
                }} />
            </div>

            <strong style={{
                fontSize: "12px",
                minWidth: "35px"
            }}>
                {progress || 0}%
            </strong>
        </div>
    );

    if (loading && !statistics) {
        return <div className="dashboard-message">Loading dashboard...</div>;
    }

    if (error && !statistics) {
        return (
            <div className="dashboard-message">
                <p>{error}</p>
                <button onClick={fetchDashboard}>Try Again</button>
            </div>
        );
    }

    const cards = [
        {
            title: "Total Projects",
            value: statistics.totalProjects,
            icon: "🏗️"
        },
        {
            title: "Ongoing Projects",
            value: statistics.ongoingProjects,
            icon: "🚧"
        },
        {
            title: "Completed Tasks",
            value: statistics.completedTasks,
            icon: "✅"
        },
        {
            title: "Total Resources",
            value: statistics.totalResources,
            icon: "🧰"
        },
        {
            title: "Total Milestones",
            value: statistics.totalMilestones,
            icon: "🎯"
        },
        {
            title: "Total Expenses",
            value: formatCurrency(statistics.totalExpenses),
            icon: "💰"
        }
    ];

    return (
        <div className="dashboard-content">
            <div className="dashboard-heading">
                <div>
                    <h1>Dashboard</h1>
                    <p>Overview of your construction projects</p>
                </div>

                <button
                    onClick={fetchDashboard}
                    disabled={loading}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        padding: "10px 15px",
                        border: "1px solid #e3e8ef",
                        borderRadius: "7px",
                        background: "#fff",
                        cursor: "pointer"
                    }}
                >
                    <RefreshCw size={16} />
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error && <p className="login-error">{error}</p>}

            <div className="stats-grid">
                {cards.map((card) => (
                    <div className="stat-card" key={card.title}>
                        <span className="stat-icon">{card.icon}</span>
                        <p>{card.title}</p>
                        <h2>{card.value}</h2>
                    </div>
                ))}
            </div>

            <div className="dashboard-sections">
                <section className="dashboard-panel">
                    <h2>Recent Projects</h2>

                    {recentProjects.length === 0 ? (
                        <p>No projects available.</p>
                    ) : (
                        recentProjects.map((project) => (
                            <div
                                className="dashboard-list-item"
                                key={project._id}
                                style={{
                                    display: "block",
                                    padding: "15px 0"
                                }}
                            >
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "10px",
                                    marginBottom: "10px"
                                }}>
                                    <div>
                                        <strong>{project.projectName}</strong>
                                        <p>{project.location}</p>
                                    </div>

                                    <span className="status-label">
                                        {project.status}
                                    </span>
                                </div>

                                <div style={{ marginBottom: "5px" }}>
                                    <ProgressBar progress={project.progress} />
                                </div>
                            </div>
                        ))
                    )}
                </section>

                <section className="dashboard-panel">
                    <h2>Recent Tasks</h2>

                    {recentTasks.length === 0 ? (
                        <p>No tasks available.</p>
                    ) : (
                        recentTasks.map((task) => (
                            <div
                                className="dashboard-list-item"
                                key={task._id}
                                style={{
                                    display: "block",
                                    padding: "15px 0"
                                }}
                            >
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "10px",
                                    marginBottom: "10px"
                                }}>
                                    <div>
                                        <strong>{task.title}</strong>
                                        <p>{task.status}</p>
                                    </div>

                                    <span>{task.priority}</span>
                                </div>

                                <ProgressBar progress={task.progress} />
                            </div>
                        ))
                    )}
                </section>
            </div>

            <div className="dashboard-panel" style={{ marginTop: "20px" }}>
                <h2>Milestone Overview</h2>

                <div className="stats-grid">
                    <div>
                        <p>Total Milestones</p>
                        <h2>{statistics.totalMilestones}</h2>
                    </div>

                    <div>
                        <p>Completed Milestones</p>
                        <h2>{statistics.completedMilestones}</h2>
                    </div>

                    <div>
                        <p>Pending Milestones</p>
                        <h2>{statistics.pendingMilestones}</h2>
                    </div>
                </div>
            </div>

            <div className="dashboard-panel" style={{ marginTop: "20px" }}>
                <h2>Budget Overview</h2>

                <div className="stats-grid">
                    <div>
                        <p>Total Budget</p>
                        <h2>{formatCurrency(statistics.totalBudget)}</h2>
                    </div>

                    <div>
                        <p>Total Expenses</p>
                        <h2>{formatCurrency(statistics.totalExpenses)}</h2>
                    </div>

                    <div>
                        <p>Remaining Budget</p>
                        <h2>{formatCurrency(statistics.remainingBudget)}</h2>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
