
import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import api from "../services/api";

function Projects() {
    const [projects, setProjects] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        projectName: "",
        location: "",
        description: "",
        startDate: "",
        endDate: "",
        budget: "",
        projectManager: ""
    });

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await api.get("/projects");
            setProjects(response.data.projects || response.data);
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load projects.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            await api.post("/projects", {
                ...form,
                budget: Number(form.budget)
            });

            setForm({
                projectName: "",
                location: "",
                description: "",
                startDate: "",
                endDate: "",
                budget: "",
                projectManager: ""
            });

            setShowForm(false);
            fetchProjects();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to create project.");
        }
    };

    const deleteProject = async (id) => {
        if (!window.confirm("Are you sure you want to delete this project?")) {
            return;
        }

        try {
            await api.delete(`/projects/${id}`);
            fetchProjects();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to delete project.");
        }
    };

    return (
        <div className="dashboard-content">
            <div className="dashboard-heading">
                <h1>Projects Management</h1>
                <p>Create, monitor and manage construction projects.</p>
            </div>

            <div className="dashboard-panel">
                <div className="project-toolbar">
                    <h2>All Projects ({projects.length})</h2>

                    <div className="project-actions">
                        <button onClick={fetchProjects}>
                            <RefreshCw size={16} /> Refresh
                        </button>

                        <button onClick={() => setShowForm(!showForm)}>
                            <Plus size={16} /> Add Project
                        </button>
                    </div>
                </div>

                {error && <p className="login-error">{error}</p>}

                {showForm && (
                    <form className="project-form" onSubmit={handleSubmit}>
                        <h2>Create New Project</h2>

                        <input
                            placeholder="Project Name"
                            value={form.projectName}
                            onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                            required
                        />

                        <input
                            placeholder="Location"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            required
                        />

                        <input
                            placeholder="Project Manager"
                            value={form.projectManager}
                            onChange={(e) => setForm({ ...form, projectManager: e.target.value })}
                            required
                        />

                        <textarea
                            placeholder="Project Description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />

                        <label>Start Date</label>
                        <input
                            type="date"
                            value={form.startDate}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                            required
                        />

                        <label>End Date</label>
                        <input
                            type="date"
                            value={form.endDate}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                            required
                        />

                        <input
                            type="number"
                            placeholder="Budget (₹)"
                            value={form.budget}
                            onChange={(e) => setForm({ ...form, budget: e.target.value })}
                            min="0"
                            required
                        />

                        <button type="submit">Save Project</button>
                        <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
                    </form>
                )}

                {loading ? (
                    <p>Loading projects...</p>
                ) : projects.length === 0 ? (
                    <p>No projects found. Add your first project.</p>
                ) : (
                    <div className="project-table-wrapper">
                        <table className="project-table">
                            <thead>
                                <tr>
                                    <th>Project</th>
                                    <th>Location</th>
                                    <th>Manager</th>
                                    <th>Budget</th>
                                    <th>Progress</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {projects.map((project) => (
                                    <tr key={project._id}>
                                        <td>{project.projectName}</td>
                                        <td>{project.location}</td>
                                        <td>{project.projectManager}</td>
                                        <td>₹{Number(project.budget).toLocaleString("en-IN")}</td>
                                        <td>{project.progress}%</td>
                                        <td>{project.status}</td>
                                        <td>
                                            <button
                                                className="delete-project"
                                                onClick={() => deleteProject(project._id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Projects;
