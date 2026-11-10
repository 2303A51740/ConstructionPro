
import { useEffect, useState } from "react";
import api from "../services/api";
import { Plus, ClipboardList, RefreshCw } from "lucide-react";

function getArray(data, keys) {
    if (Array.isArray(data)) return data;

    for (const key of keys) {
        if (Array.isArray(data?.[key])) {
            return data[key];
        }
    }

    return [];
}

function getId(value) {
    return typeof value === "object" && value !== null
        ? value._id
        : value;
}

function getUserName() {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        return user.name || user.fullName || user.username || "";
    } catch {
        return "";
    }
}

function DailyProgress() {
    const [records, setRecords] = useState([]);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);

    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({
        project: "",
        task: "",
        date: new Date().toISOString().split("T")[0],
        workDescription: "",
        completedWork: "",
        progressPercentage: 0,
        workersPresent: 0,
        materialsUsed: "",
        equipmentUsed: "",
        issues: "",
        recordedBy: getUserName()
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError("");

        try {
            const [progressResponse, projectResponse, taskResponse] =
                await Promise.all([
                    api.get("/daily-progress"),
                    api.get("/projects"),
                    api.get("/tasks")
                ]);

            setRecords(
                getArray(progressResponse.data, [
                    "dailyProgress",
                    "records",
                    "progress"
                ])
            );

            setProjects(
                getArray(projectResponse.data, ["projects"])
            );

            setTasks(
                getArray(taskResponse.data, ["tasks"])
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load daily progress data. Please check your connection."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
            ...(name === "project" ? { task: "" } : {})
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
                ...form,
                task: form.task || null,
                progressPercentage: Number(form.progressPercentage),
                workersPresent: Number(form.workersPresent)
            };

            const response = await api.post("/daily-progress", payload);

            const newRecord =
                response.data.dailyProgress ||
                response.data.record ||
                response.data.progress;

            if (newRecord) {
                setRecords((previous) => [newRecord, ...previous]);
            } else {
                await fetchData();
            }

            setSuccess("Daily progress recorded successfully!");

            setForm({
                project: "",
                task: "",
                date: new Date().toISOString().split("T")[0],
                workDescription: "",
                completedWork: "",
                progressPercentage: 0,
                workersPresent: 0,
                materialsUsed: "",
                equipmentUsed: "",
                issues: "",
                recordedBy: getUserName()
            });

            setShowForm(false);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to save daily progress. Please check the entered details."
            );
        } finally {
            setSaving(false);
        }
    };

    const selectedTasks = tasks.filter((task) => {
        return getId(task.project) === form.project;
    });

    const getProjectName = (project) => {
        if (typeof project === "object" && project !== null) {
            return project.projectName || project.name || "Unknown Project";
        }

        const found = projects.find((item) => item._id === project);
        return found?.projectName || "Unknown Project";
    };

    const getTaskName = (task) => {
        if (!task) return "No task";

        if (typeof task === "object") {
            return task.title || task.taskName || "Unknown Task";
        }

        const found = tasks.find((item) => item._id === task);
        return found?.title || "Unknown Task";
    };

    return (
        <div className="dashboard-content">
            <div className="dashboard-heading">
                <h1>Daily Progress</h1>
                <p>Record and monitor daily construction site activities.</p>
            </div>

            <div className="project-toolbar">
                <h2>Daily Progress Records</h2>

                <div className="project-actions">
                    <button onClick={fetchData} type="button">
                        <RefreshCw size={15} />
                        Refresh
                    </button>

                    <button
                        onClick={() => {
                            setShowForm(!showForm);
                            setError("");
                            setSuccess("");
                        }}
                        type="button"
                    >
                        <Plus size={16} />
                        Add Progress
                    </button>
                </div>
            </div>

            {error && (
                <div className="progress-alert progress-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="progress-alert progress-success">
                    {success}
                </div>
            )}

            {showForm && (
                <form className="project-form" onSubmit={handleSubmit}>
                    <h2>Record Daily Site Progress</h2>

                    <label>
                        Construction Project *
                        <select
                            name="project"
                            value={form.project}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Project</option>

                            {projects.map((project) => (
                                <option key={project._id} value={project._id}>
                                    {project.projectName}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Related Task
                        <select
                            name="task"
                            value={form.task}
                            onChange={handleChange}
                        >
                            <option value="">No specific task</option>

                            {selectedTasks.map((task) => (
                                <option key={task._id} value={task._id}>
                                    {task.title}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Progress Date *
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Work Description *
                        <input
                            type="text"
                            name="workDescription"
                            placeholder="Example: Foundation construction"
                            value={form.workDescription}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Completed Work *
                        <textarea
                            name="completedWork"
                            placeholder="Describe the work completed today..."
                            value={form.completedWork}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Progress Percentage *
                        <input
                            type="number"
                            name="progressPercentage"
                            min="0"
                            max="100"
                            value={form.progressPercentage}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Workers Present
                        <input
                            type="number"
                            name="workersPresent"
                            min="0"
                            value={form.workersPresent}
                            onChange={handleChange}
                        />
                    </label>

                    <label>
                        Materials Used
                        <textarea
                            name="materialsUsed"
                            placeholder="Example: 50 cement bags, 20 steel rods"
                            value={form.materialsUsed}
                            onChange={handleChange}
                        />
                    </label>

                    <label>
                        Equipment Used
                        <textarea
                            name="equipmentUsed"
                            placeholder="Example: Concrete mixer, excavator"
                            value={form.equipmentUsed}
                            onChange={handleChange}
                        />
                    </label>

                    <label>
                        Site Issues
                        <textarea
                            name="issues"
                            placeholder="Describe delays or problems, if any"
                            value={form.issues}
                            onChange={handleChange}
                        />
                    </label>

                    <label>
                        Recorded By *
                        <input
                            type="text"
                            name="recordedBy"
                            placeholder="Site Engineer name"
                            value={form.recordedBy}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <div className="progress-form-actions">
                        <button type="submit" disabled={saving}>
                            {saving ? "Saving..." : "Save Progress"}
                        </button>

                        <button
                            type="button"
                            className="progress-cancel"
                            onClick={() => setShowForm(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="dashboard-panel">
                <h2>
                    <ClipboardList size={18} />
                    Progress History
                </h2>

                {loading ? (
                    <p className="dashboard-message">
                        Loading progress records...
                    </p>
                ) : records.length === 0 ? (
                    <p className="dashboard-message">
                        No daily progress records found.
                    </p>
                ) : (
                    <div className="project-table-wrapper">
                        <table className="project-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Project</th>
                                    <th>Task</th>
                                    <th>Work Description</th>
                                    <th>Progress</th>
                                    <th>Workers</th>
                                    <th>Recorded By</th>
                                </tr>
                            </thead>

                            <tbody>
                                {records.map((record) => (
                                    <tr key={record._id}>
                                        <td>
                                            {record.date
                                                ? new Date(record.date).toLocaleDateString()
                                                : "-"}
                                        </td>

                                        <td>
                                            {getProjectName(record.project)}
                                        </td>

                                        <td>
                                            {getTaskName(record.task)}
                                        </td>

                                        <td>
                                            {record.workDescription}
                                        </td>

                                        <td>
                                            <strong>
                                                {record.progressPercentage}%
                                            </strong>

                                            <div className="milestone-progress">
                                                <div
                                                    style={{
                                                        width: `${Math.min(
                                                            100,
                                                            Math.max(0, Number(record.progressPercentage) || 0)
                                                        )}%`
                                                    }}
                                                />
                                            </div>
                                        </td>

                                        <td>{record.workersPresent ?? 0}</td>

                                        <td>{record.recordedBy || "-"}</td>
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

export default DailyProgress;
