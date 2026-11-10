
import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import api from "../services/api";

function Milestones() {
    const [milestones, setMilestones] = useState([]);
    const [projects, setProjects] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [savingId, setSavingId] = useState(null);

    const emptyForm = {
        title: "",
        description: "",
        project: "",
        dueDate: "",
        status: "Pending",
        progress: 0
    };

    const [form, setForm] = useState(emptyForm);

    const fetchData = async () => {
        try {
            setLoading(true);

            const [milestoneResponse, projectResponse] = await Promise.all([
                api.get("/milestones"),
                api.get("/projects")
            ]);

            setMilestones(milestoneResponse.data.milestones || []);

            setProjects(
                projectResponse.data.projects ||
                (Array.isArray(projectResponse.data)
                    ? projectResponse.data
                    : [])
            );

            setError("");
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to load milestones."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const updateMilestone = async (id, updates) => {
        try {
            setSavingId(id);
            setError("");

            const response = await api.put(`/milestones/${id}`, updates);

            setMilestones((previous) =>
                previous.map((milestone) =>
                    milestone._id === id
                        ? response.data.milestone
                        : milestone
                )
            );
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to update milestone."
            );

            await fetchData();
        } finally {
            setSavingId(null);
        }
    };

    const handleStatusChange = async (milestone, status) => {
        let progress = milestone.progress;

        if (status === "Pending") progress = 0;
        if (status === "Completed") progress = 100;

        // A completed milestone reopened as In Progress or Delayed
        // starts at 0%, so it can be edited again.
        if (
            milestone.status === "Completed" &&
            status !== "Completed"
        ) {
            progress = 0;
        }

        await updateMilestone(milestone._id, {
            status,
            progress
        });
    };

    const handleProgressChange = (id, value) => {
        setMilestones((previous) =>
            previous.map((milestone) =>
                milestone._id === id
                    ? { ...milestone, progress: value }
                    : milestone
            )
        );
    };

    const saveProgress = async (milestone) => {
        if (
            milestone.status === "Pending" ||
            milestone.status === "Completed"
        ) {
            return;
        }

        const progress = Number(milestone.progress);

        if (!Number.isInteger(progress) || progress < 0 || progress > 99) {
            setError("Progress must be a whole number between 0 and 99.");
            await fetchData();
            return;
        }

        await updateMilestone(milestone._id, { progress });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const progress =
                form.status === "Completed"
                    ? 100
                    : form.status === "Pending"
                        ? 0
                        : Number(form.progress);

            await api.post("/milestones", {
                ...form,
                progress
            });

            setForm(emptyForm);
            setShowForm(false);
            await fetchData();
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to create milestone."
            );
        }
    };

    const deleteMilestone = async (id) => {
        if (!window.confirm("Are you sure you want to delete this milestone?")) {
            return;
        }

        try {
            await api.delete(`/milestones/${id}`);
            await fetchData();
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to delete milestone."
            );
        }
    };

    return (
        <div className="dashboard-content">
            <div className="dashboard-heading">
                <h1>Milestones Management</h1>
                <p>Track important construction targets and deadlines.</p>
            </div>

            <div className="dashboard-panel">
                <div className="project-toolbar">
                    <h2>All Milestones ({milestones.length})</h2>

                    <div className="project-actions">
                        <button onClick={fetchData}>
                            <RefreshCw size={16} /> Refresh
                        </button>

                        <button onClick={() => setShowForm(!showForm)}>
                            <Plus size={16} /> Add Milestone
                        </button>
                    </div>
                </div>

                {error && <p className="login-error">{error}</p>}

                {showForm && (
                    <form className="project-form" onSubmit={handleSubmit}>
                        <h2>Create New Milestone</h2>

                        <input
                            placeholder="Milestone Title"
                            value={form.title}
                            onChange={(e) =>
                                setForm({ ...form, title: e.target.value })
                            }
                            required
                        />

                        <select
                            value={form.project}
                            onChange={(e) =>
                                setForm({ ...form, project: e.target.value })
                            }
                            required
                        >
                            <option value="">Select Project</option>
                            {projects.map((project) => (
                                <option key={project._id} value={project._id}>
                                    {project.projectName}
                                </option>
                            ))}
                        </select>

                        <label>Due Date</label>
                        <input
                            type="date"
                            value={form.dueDate}
                            onChange={(e) =>
                                setForm({ ...form, dueDate: e.target.value })
                            }
                            required
                        />

                        <label>Status</label>
                        <select
                            value={form.status}
                            onChange={(e) => {
                                const status = e.target.value;

                                setForm({
                                    ...form,
                                    status,
                                    progress:
                                        status === "Completed"
                                            ? 100
                                            : status === "Pending"
                                                ? 0
                                                : form.progress
                                });
                            }}
                        >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Delayed">Delayed</option>
                        </select>

                        <label>Progress (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="99"
                            value={
                                form.status === "Completed"
                                    ? 100
                                    : form.status === "Pending"
                                        ? 0
                                        : form.progress
                            }
                            disabled={
                                form.status === "Pending" ||
                                form.status === "Completed"
                            }
                            onChange={(e) =>
                                setForm({ ...form, progress: e.target.value })
                            }
                        />

                        <textarea
                            placeholder="Milestone Description"
                            value={form.description}
                            onChange={(e) =>
                                setForm({ ...form, description: e.target.value })
                            }
                        />

                        <button type="submit">Save Milestone</button>

                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setForm(emptyForm);
                            }}
                        >
                            Cancel
                        </button>
                    </form>
                )}

                {loading ? (
                    <p>Loading milestones...</p>
                ) : milestones.length === 0 ? (
                    <p>No milestones found. Create your first milestone.</p>
                ) : (
                    <div className="project-table-wrapper">
                        <table className="project-table">
                            <thead>
                                <tr>
                                    <th>Milestone</th>
                                    <th>Project</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Progress</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {milestones.map((milestone) => (
                                    <tr key={milestone._id}>
                                        <td>{milestone.title}</td>

                                        <td>
                                            {milestone.project?.projectName || "Project"}
                                        </td>

                                        <td>
                                            {milestone.dueDate
                                                ? new Date(milestone.dueDate).toLocaleDateString("en-IN")
                                                : "-"}
                                        </td>

                                        <td>
                                            <select
                                                value={milestone.status}
                                                disabled={savingId === milestone._id}
                                                onChange={(e) =>
                                                    handleStatusChange(
                                                        milestone,
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Delayed">Delayed</option>
                                            </select>
                                        </td>

                                        <td>
                                            <div style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px"
                                            }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="99"
                                                    value={milestone.progress}
                                                    disabled={
                                                        milestone.status === "Pending" ||
                                                        milestone.status === "Completed" ||
                                                        savingId === milestone._id
                                                    }
                                                    onChange={(e) =>
                                                        handleProgressChange(
                                                            milestone._id,
                                                            e.target.value
                                                        )
                                                    }
                                                    onBlur={() => saveProgress(milestone)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    style={{
                                                        width: "65px",
                                                        padding: "6px"
                                                    }}
                                                />

                                                <span>%</span>

                                                {savingId === milestone._id && (
                                                    <span>Saving...</span>
                                                )}
                                            </div>

                                            <div className="milestone-progress">
                                                <div
                                                    style={{
                                                        width: `${milestone.progress}%`
                                                    }}
                                                />
                                            </div>
                                        </td>

                                        <td>
                                            <button
                                                className="delete-project"
                                                onClick={() =>
                                                    deleteMilestone(milestone._id)
                                                }
                                                title="Delete milestone"
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

export default Milestones;
