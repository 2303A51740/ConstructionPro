
import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import api from "../services/api";

function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [savingId, setSavingId] = useState(null);

    const emptyForm = {
        title: "",
        description: "",
        project: "",
        assignedTo: "",
        startDate: "",
        dueDate: "",
        priority: "Medium",
        status: "Pending",
        progress: 0
    };

    const [form, setForm] = useState(emptyForm);

    const fetchData = async () => {
        try {
            setLoading(true);

            const [taskResponse, projectResponse] = await Promise.all([
                api.get("/tasks"),
                api.get("/projects")
            ]);

            setTasks(taskResponse.data.tasks || []);

            setProjects(
                projectResponse.data.projects ||
                (Array.isArray(projectResponse.data)
                    ? projectResponse.data
                    : [])
            );

            setError("");
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to load tasks."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStatusChange = async (task, status) => {
        let progress = task.progress;

        if (status === "Pending") progress = 0;
        if (status === "Completed") progress = 100;

        await updateTask(task._id, { status, progress });
    };

    const updateTask = async (id, updates) => {
        try {
            setSavingId(id);
            setError("");

            const response = await api.put(`/tasks/${id}`, updates);

            setTasks((previous) =>
                previous.map((task) =>
                    task._id === id ? response.data.task : task
                )
            );
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to update task."
            );

            await fetchData();
        } finally {
            setSavingId(null);
        }
    };

    const handleProgressChange = (id, value) => {
        setTasks((previous) =>
            previous.map((task) =>
                task._id === id
                    ? { ...task, progress: value }
                    : task
            )
        );
    };

    const saveProgress = async (task) => {
        if (task.status === "Pending" || task.status === "Completed") {
            return;
        }

        const progress = Number(task.progress);

        if (!Number.isInteger(progress) || progress < 0 || progress > 99) {
            setError("Progress must be a whole number between 0 and 99.");
            await fetchData();
            return;
        }

        await updateTask(task._id, { progress });
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

            await api.post("/tasks", {
                ...form,
                progress
            });

            setForm(emptyForm);
            setShowForm(false);
            await fetchData();
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to create task."
            );
        }
    };

    const deleteTask = async (id) => {
        if (!window.confirm("Are you sure you want to delete this task?")) {
            return;
        }

        try {
            await api.delete(`/tasks/${id}`);
            await fetchData();
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to delete task."
            );
        }
    };

    return (
        <div className="dashboard-content">
            <div className="dashboard-heading">
                <h1>Tasks Management</h1>
                <p>Create, assign and monitor construction activities.</p>
            </div>

            <div className="dashboard-panel">
                <div className="project-toolbar">
                    <h2>All Tasks ({tasks.length})</h2>

                    <div className="project-actions">
                        <button onClick={fetchData}>
                            <RefreshCw size={16} /> Refresh
                        </button>

                        <button onClick={() => setShowForm(!showForm)}>
                            <Plus size={16} /> Add Task
                        </button>
                    </div>
                </div>

                {error && <p className="login-error">{error}</p>}

                {showForm && (
                    <form className="project-form" onSubmit={handleSubmit}>
                        <h2>Create New Task</h2>

                        <input
                            placeholder="Task Title"
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

                        <input
                            placeholder="Assigned To"
                            value={form.assignedTo}
                            onChange={(e) =>
                                setForm({ ...form, assignedTo: e.target.value })
                            }
                            required
                        />

                        <label>Start Date</label>
                        <input
                            type="date"
                            value={form.startDate}
                            onChange={(e) =>
                                setForm({ ...form, startDate: e.target.value })
                            }
                            required
                        />

                        <label>Due Date</label>
                        <input
                            type="date"
                            value={form.dueDate}
                            onChange={(e) =>
                                setForm({ ...form, dueDate: e.target.value })
                            }
                            required
                        />

                        <select
                            value={form.priority}
                            onChange={(e) =>
                                setForm({ ...form, priority: e.target.value })
                            }
                        >
                            <option value="Low">Low Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="High">High Priority</option>
                        </select>

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
                            value={form.status === "Completed" ? 100 : form.status === "Pending" ? 0 : form.progress}
                            disabled={form.status === "Pending" || form.status === "Completed"}
                            onChange={(e) =>
                                setForm({ ...form, progress: e.target.value })
                            }
                        />

                        <textarea
                            placeholder="Task Description"
                            value={form.description}
                            onChange={(e) =>
                                setForm({ ...form, description: e.target.value })
                            }
                        />

                        <button type="submit">Save Task</button>

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
                    <p>Loading tasks...</p>
                ) : tasks.length === 0 ? (
                    <p>No tasks found. Create your first task.</p>
                ) : (
                    <div className="project-table-wrapper">
                        <table className="project-table">
                            <thead>
                                <tr>
                                    <th>Task</th>
                                    <th>Assigned To</th>
                                    <th>Due Date</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Progress</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {tasks.map((task) => (
                                    <tr key={task._id}>
                                        <td>{task.title}</td>
                                        <td>{task.assignedTo}</td>

                                        <td>
                                            {task.dueDate
                                                ? new Date(task.dueDate).toLocaleDateString("en-IN")
                                                : "-"}
                                        </td>

                                        <td>{task.priority}</td>

                                        <td>
                                            <select
                                                value={task.status}
                                                disabled={savingId === task._id}
                                                onChange={(e) =>
                                                    handleStatusChange(task, e.target.value)
                                                }
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Delayed">Delayed</option>
                                            </select>
                                        </td>

                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="99"
                                                    value={task.progress}
                                                    disabled={
                                                        task.status === "Pending" ||
                                                        task.status === "Completed" ||
                                                        savingId === task._id
                                                    }
                                                    onChange={(e) =>
                                                        handleProgressChange(task._id, e.target.value)
                                                    }
                                                    onBlur={() => saveProgress(task)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    style={{ width: "65px", padding: "6px" }}
                                                />
                                                <span>%</span>
                                                {savingId === task._id && <span>Saving...</span>}
                                            </div>
                                        </td>

                                        <td>
                                            <button
                                                className="delete-project"
                                                onClick={() => deleteTask(task._id)}
                                                title="Delete task"
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

export default Tasks;
