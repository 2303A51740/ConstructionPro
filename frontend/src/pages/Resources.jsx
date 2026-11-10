
import { useEffect, useState } from "react";
import api from "../services/api";
import {
    Plus,
    Trash2,
    RefreshCw,
    Package,
    Save,
    Pencil,
    X
} from "lucide-react";

function Resources() {
    const [resources, setResources] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [projectAssignments, setProjectAssignments] = useState({});
    const [savingResourceId, setSavingResourceId] = useState(null);
    const [editingResourceId, setEditingResourceId] = useState(null);

    const initialForm = {
        name: "",
        type: "Material",
        category: "",
        quantity: "",
        unit: "Units",
        unitCost: "",
        status: "Available",
        assignedProject: "",
        contact: ""
    };

    const [form, setForm] = useState(initialForm);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");

            const [resourceResponse, projectResponse] = await Promise.all([
                api.get("/resources"),
                api.get("/projects")
            ]);

            const resourceData = resourceResponse.data;
            const projectData = projectResponse.data;

            const resourceList = Array.isArray(resourceData)
                ? resourceData
                : resourceData.resources || [];

            const projectList = Array.isArray(projectData)
                ? projectData
                : projectData.projects || [];

            setResources(resourceList);
            setProjects(projectList);

            const assignments = {};

            resourceList.forEach((resource) => {
                assignments[resource._id] =
                    resource.assignedProject?._id ||
                    resource.assignedProject ||
                    "";
            });

            setProjectAssignments(assignments);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load resources."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setError("");
            setSuccess("");

            await api.post("/resources", {
                ...form,
                quantity: Number(form.quantity),
                unitCost: Number(form.unitCost || 0),
                assignedProject: form.assignedProject || null
            });

            setSuccess("Resource added successfully!");
            setForm(initialForm);

            await fetchData();

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to add resource."
            );
        }
    };

    const handleProjectChange = (resourceId, projectId) => {
        setProjectAssignments((previous) => ({
            ...previous,
            [resourceId]: projectId
        }));
    };

    const handleAssignProject = async (resource) => {
        try {
            setError("");
            setSuccess("");
            setSavingResourceId(resource._id);

            const assignedProject =
                projectAssignments[resource._id] || null;

            await api.put(`/resources/${resource._id}`, {
                assignedProject
            });

            setSuccess(
                assignedProject
                    ? "Project assigned successfully!"
                    : "Project assignment removed successfully!"
            );

            setEditingResourceId(null);

            await fetchData();

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update project assignment."
            );
        } finally {
            setSavingResourceId(null);
        }
    };

    const handleCancelEdit = (resource) => {
        const currentProjectId =
            resource.assignedProject?._id ||
            resource.assignedProject ||
            "";

        setProjectAssignments((previous) => ({
            ...previous,
            [resource._id]: currentProjectId
        }));

        setEditingResourceId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(
            "Are you sure you want to delete this resource?"
        )) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await api.delete(`/resources/${id}`);

            setSuccess("Resource deleted successfully!");

            await fetchData();

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to delete resource."
            );
        }
    };

    return (
        <div className="dashboard-content">

            <div className="dashboard-heading">
                <div>
                    <h1>Resource Management</h1>
                    <p>
                        Manage construction materials, equipment and labour.
                    </p>
                </div>

                <button
                    className="primary-button"
                    onClick={fetchData}
                    disabled={loading}
                >
                    <RefreshCw size={16} /> Refresh
                </button>
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

            <div className="dashboard-panel">
                <h2>
                    <Plus size={19} /> Add New Resource
                </h2>

                <form
                    className="project-form"
                    onSubmit={handleSubmit}
                >
                    <div className="form-grid">

                        <label>
                            Resource Name
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Example: Cement"
                                required
                            />
                        </label>

                        <label>
                            Resource Type
                            <select
                                name="type"
                                value={form.type}
                                onChange={handleChange}
                            >
                                <option value="Material">Material</option>
                                <option value="Equipment">Equipment</option>
                                <option value="Labor">Labor</option>
                            </select>
                        </label>

                        <label>
                            Category
                            <input
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                placeholder="Example: Building Material"
                                required
                            />
                        </label>

                        <label>
                            Quantity
                            <input
                                type="number"
                                name="quantity"
                                value={form.quantity}
                                onChange={handleChange}
                                min="0"
                                placeholder="Enter quantity"
                                required
                            />
                        </label>

                        <label>
                            Unit
                            <input
                                name="unit"
                                value={form.unit}
                                onChange={handleChange}
                                placeholder="Bags, pieces, workers"
                            />
                        </label>

                        <label>
                            Unit Cost (₹)
                            <input
                                type="number"
                                name="unitCost"
                                value={form.unitCost}
                                onChange={handleChange}
                                min="0"
                                placeholder="Enter unit cost"
                            />
                        </label>

                        <label>
                            Status
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                            >
                                <option value="Available">Available</option>
                                <option value="Assigned">Assigned</option>
                                <option value="In Use">In Use</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </label>

                        <label>
                            Assigned Project
                            <select
                                name="assignedProject"
                                value={form.assignedProject}
                                onChange={handleChange}
                            >
                                <option value="">
                                    No project assigned
                                </option>

                                {projects.map((project) => (
                                    <option
                                        key={project._id}
                                        value={project._id}
                                    >
                                        {project.projectName}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Contact Number
                            <input
                                name="contact"
                                value={form.contact}
                                onChange={handleChange}
                                placeholder="Enter contact number"
                            />
                        </label>

                    </div>

                    <button
                        type="submit"
                        className="primary-button"
                    >
                        <Plus size={16} /> Add Resource
                    </button>
                </form>
            </div>

            <div className="dashboard-panel">
                <h2>
                    <Package size={19} /> Resource Inventory
                </h2>

                {loading ? (
                    <p>Loading resources...</p>
                ) : (
                    <div className="table-container">

                        <table className="project-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Category</th>
                                    <th>Quantity</th>
                                    <th>Unit Cost</th>
                                    <th>Status</th>
                                    <th>Project</th>
                                    <th>Contact</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {resources.length > 0 ? (
                                    resources.map((resource) => {
                                        const currentProjectId =
                                            resource.assignedProject?._id ||
                                            resource.assignedProject ||
                                            "";

                                        const selectedProjectId =
                                            projectAssignments[resource._id] || "";

                                        const assignmentChanged =
                                            selectedProjectId !== currentProjectId;

                                        return (
                                            <tr key={resource._id}>

                                                <td>{resource.name}</td>

                                                <td>{resource.type}</td>

                                                <td>{resource.category}</td>

                                                <td>
                                                    {resource.quantity} {resource.unit}
                                                </td>

                                                <td>
                                                    ₹
                                                    {Number(
                                                        resource.unitCost || 0
                                                    ).toLocaleString("en-IN")}
                                                </td>

                                                <td>{resource.status}</td>

                                                <td>
                                                    {editingResourceId === resource._id ? (
                                                        <div>
                                                            <select
                                                                value={selectedProjectId}
                                                                onChange={(e) =>
                                                                    handleProjectChange(
                                                                        resource._id,
                                                                        e.target.value
                                                                    )
                                                                }
                                                            >
                                                                <option value="">
                                                                    No project assigned
                                                                </option>

                                                                {projects.map((project) => (
                                                                    <option
                                                                        key={project._id}
                                                                        value={project._id}
                                                                    >
                                                                        {project.projectName}
                                                                    </option>
                                                                ))}
                                                            </select>

                                                            <div style={{
                                                                display: "flex",
                                                                gap: "6px",
                                                                marginTop: "6px"
                                                            }}>
                                                                <button
                                                                    type="button"
                                                                    className="primary-button"
                                                                    onClick={() =>
                                                                        handleAssignProject(resource)
                                                                    }
                                                                    disabled={
                                                                        !assignmentChanged ||
                                                                        savingResourceId === resource._id
                                                                    }
                                                                    style={{
                                                                        padding: "6px 10px",
                                                                        fontSize: "12px"
                                                                    }}
                                                                >
                                                                    <Save size={14} />

                                                                    {savingResourceId === resource._id
                                                                        ? "Saving..."
                                                                        : "Save"}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleCancelEdit(resource)
                                                                    }
                                                                    disabled={
                                                                        savingResourceId === resource._id
                                                                    }
                                                                    style={{
                                                                        padding: "6px 10px",
                                                                        fontSize: "12px"
                                                                    }}
                                                                >
                                                                    <X size={14} /> Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div>
                                                                {resource.assignedProject?.projectName ||
                                                                    "Not Assigned"}
                                                            </div>

                                                            <button
                                                                type="button"
                                                                className="primary-button"
                                                                onClick={() =>
                                                                    setEditingResourceId(resource._id)
                                                                }
                                                                style={{
                                                                    padding: "6px 10px",
                                                                    fontSize: "12px",
                                                                    marginTop: "6px"
                                                                }}
                                                            >
                                                                <Pencil size={14} />
                                                                Change Project
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>

                                                <td>
                                                    {resource.contact || "-"}
                                                </td>

                                                <td>
                                                    <button
                                                        className="delete-button"
                                                        onClick={() =>
                                                            handleDelete(resource._id)
                                                        }
                                                        title="Delete resource"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>

                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9">
                                            No resources found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                    </div>
                )}
            </div>

        </div>
    );
}

export default Resources;
