
import { useEffect, useState } from "react";
import api from "../services/api";

function Reports() {
    const [activeTab, setActiveTab] = useState("project");

    const [projectReport, setProjectReport] = useState([]);
    const [resourceReport, setResourceReport] = useState({});
    const [materialReport, setMaterialReport] = useState([]);
    const [milestoneReport, setMilestoneReport] = useState({});
    const [consumptionRecords, setConsumptionRecords] = useState([]);

    const [projects, setProjects] = useState([]);
    const [resources, setResources] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [formData, setFormData] = useState({
        project: "",
        resource: "",
        materialName: "",
        quantityConsumed: "",
        unit: "Bags",
        date: new Date().toISOString().split("T")[0],
        recordedBy: "",
        notes: ""
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(Number(amount) || 0);
    };

    const formatDate = (date) => {
        if (!date) return "-";

        return new Date(date).toLocaleDateString("en-IN");
    };

    const fetchReports = async () => {
        try {
            setLoading(true);
            setError("");

            const results = await Promise.allSettled([
                api.get("/reports/project-progress"),
                api.get("/reports/resource-utilization"),
                api.get("/reports/material-consumption"),
                api.get("/reports/milestone-status"),
                api.get("/reports/material-consumption-records"),
                api.get("/projects"),
                api.get("/resources")
            ]);

            const [
                projectResult,
                resourceResult,
                materialResult,
                milestoneResult,
                recordsResult,
                projectsResult,
                resourcesResult
            ] = results;

            if (projectResult.status === "fulfilled") {
                setProjectReport(
                    projectResult.value.data.reports || []
                );
            }

            if (resourceResult.status === "fulfilled") {
                setResourceReport(resourceResult.value.data || {});
            }

            if (materialResult.status === "fulfilled") {
                setMaterialReport(
                    materialResult.value.data.report || []
                );
            }

            if (milestoneResult.status === "fulfilled") {
                setMilestoneReport(milestoneResult.value.data || {});
            }

            if (recordsResult.status === "fulfilled") {
                setConsumptionRecords(
                    recordsResult.value.data.records || []
                );
            }

            if (projectsResult.status === "fulfilled") {
                const projectData = projectsResult.value.data;
                setProjects(
                    Array.isArray(projectData)
                        ? projectData
                        : projectData.projects || []
                );
            }

            if (resourcesResult.status === "fulfilled") {
                const resourceData = resourcesResult.value.data;
                setResources(
                    (Array.isArray(resourceData)
                        ? resourceData
                        : resourceData.resources || []
                    ).filter((resource) => resource.type === "Material")
                );
            }

            const failed = results.some(
                (result) => result.status === "rejected"
            );

            if (failed) {
                setError(
                    "Some report data could not be loaded. Check the relevant backend API."
                );
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load reports."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const savedUser = localStorage.getItem("user");

        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);

                setFormData((previous) => ({
                    ...previous,
                    recordedBy:
                        user.name || user.fullName || user.email || ""
                }));
            } catch {
                // Leave recordedBy empty if saved user data is invalid.
            }
        }

        fetchReports();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));

        if (name === "resource" && value) {
            const selectedResource = resources.find(
                (resource) => resource._id === value
            );

            if (selectedResource) {
                setFormData((previous) => ({
                    ...previous,
                    resource: value,
                    materialName: selectedResource.name,
                    unit: selectedResource.unit || "Units"
                }));
            }
        }
    };

    const handleConsumptionSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        try {
            const payload = {
                ...formData,
                resource: formData.resource || null,
                quantityConsumed: Number(formData.quantityConsumed)
            };

            const response = await api.post(
                "/reports/material-consumption",
                payload
            );

            setSuccess(
                response.data.message ||
                "Material consumption recorded successfully."
            );

            setFormData((previous) => ({
                ...previous,
                resource: "",
                materialName: "",
                quantityConsumed: "",
                unit: "Bags",
                date: new Date().toISOString().split("T")[0],
                notes: ""
            }));

            await fetchReports();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to record material consumption."
            );
        }
    };

    const tabs = [
        { id: "project", label: "Project Progress" },
        { id: "resource", label: "Resource Utilization" },
        { id: "material", label: "Material Consumption" },
        { id: "milestone", label: "Milestone Status" }
    ];

    const totalCompletedProjects = projectReport.filter(
        (project) => project.status === "Completed"
    ).length;

    const totalAssignedResources =
        resourceReport.assignedResourceCount || 0;

    const totalOverdueMilestones =
        milestoneReport.overdueCount || 0;

    const getProjectName = (project) => {
        if (!project) return "-";

        if (typeof project === "object") {
            return project.projectName || "-";
        }

        return projects.find((item) => item._id === project)
            ?.projectName || "-";
    };

    return (
        <div className="dashboard-content">

            <div className="dashboard-heading">
                <h1>Reports & Analytics</h1>
                <p>
                    Monitor project progress, resources, material usage
                    and milestone performance.
                </p>
            </div>

            {error && (
                <div className="message error-message">
                    {error}
                </div>
            )}

            {success && (
                <div className="message success-message">
                    {success}
                </div>
            )}

            {loading ? (
                <div className="dashboard-panel">
                    <p>Loading reports...</p>
                </div>
            ) : (
                <>
                    <div className="stats-grid">

                        <div className="stat-card">
                            <p>Total Projects</p>
                            <h2>{projectReport.length}</h2>
                        </div>

                        <div className="stat-card">
                            <p>Completed Projects</p>
                            <h2>{totalCompletedProjects}</h2>
                        </div>

                        <div className="stat-card">
                            <p>Total Resources</p>
                            <h2>{resourceReport.totalResources || 0}</h2>
                        </div>

                        <div className="stat-card">
                            <p>Overdue Milestones</p>
                            <h2>{totalOverdueMilestones}</h2>
                        </div>

                    </div>

                    <div className="dashboard-panel">

                        <div className="project-toolbar">
                            <h2>Reports Overview</h2>
                        </div>

                        <div className="report-tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    className={
                                        activeTab === tab.id
                                            ? "report-tab active"
                                            : "report-tab"
                                    }
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {activeTab === "project" && (
                            <div className="report-section">

                                <h2>Project Progress Report</h2>

                                <p className="report-description">
                                    Project completion, task status,
                                    budget and project timelines.
                                </p>

                                <div className="table-responsive">
                                    <table className="project-table">
                                        <thead>
                                            <tr>
                                                <th>Project</th>
                                                <th>Location</th>
                                                <th>Manager</th>
                                                <th>Progress</th>
                                                <th>Tasks</th>
                                                <th>Completed</th>
                                                <th>Pending</th>
                                                <th>Budget</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {projectReport.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9">
                                                        No project reports found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                projectReport.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.projectName}</td>
                                                        <td>{item.location}</td>
                                                        <td>{item.manager}</td>
                                                        <td>
                                                            <strong>
                                                                {item.progress}%
                                                            </strong>
                                                            <div className="report-progress">
                                                                <div
                                                                    style={{
                                                                        width: `${Math.min(100, Math.max(0, item.progress || 0))}%`
                                                                    }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td>{item.totalTasks}</td>
                                                        <td>{item.completedTasks}</td>
                                                        <td>{item.pendingTasks}</td>
                                                        <td>{formatCurrency(item.budget)}</td>
                                                        <td>{item.status}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                            </div>
                        )}

                        {activeTab === "resource" && (
                            <div className="report-section">

                                <h2>Resource Utilization Report</h2>

                                <p className="report-description">
                                    Overview of material, equipment and labor
                                    resources and their current status.
                                </p>

                                <div className="report-mini-stats">
                                    <div>
                                        <span>Total Resources</span>
                                        <strong>
                                            {resourceReport.totalResources || 0}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Total Quantity</span>
                                        <strong>
                                            {resourceReport.totalQuantity || 0}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Assigned Resources</span>
                                        <strong>
                                            {totalAssignedResources}
                                        </strong>
                                    </div>
                                </div>

                                <h3>Resource Type Breakdown</h3>

                                <div className="table-responsive">
                                    <table className="project-table">
                                        <thead>
                                            <tr>
                                                <th>Resource Type</th>
                                                <th>Resource Count</th>
                                                <th>Total Quantity</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {(resourceReport.typeBreakdown || []).map(
                                                (item, index) => (
                                                    <tr key={index}>
                                                        <td>{item._id}</td>
                                                        <td>{item.resourceCount}</td>
                                                        <td>{item.totalQuantity}</td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <h3 className="report-subheading">
                                    Resource Status Breakdown
                                </h3>

                                <div className="table-responsive">
                                    <table className="project-table">
                                        <thead>
                                            <tr>
                                                <th>Status</th>
                                                <th>Resource Count</th>
                                                <th>Total Quantity</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {(resourceReport.statusBreakdown || []).map(
                                                (item, index) => (
                                                    <tr key={index}>
                                                        <td>{item._id}</td>
                                                        <td>{item.resourceCount}</td>
                                                        <td>{item.totalQuantity}</td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <h3 className="report-subheading">
                                    Resource Details
                                </h3>

                                <div className="table-responsive">
                                    <table className="project-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Type</th>
                                                <th>Category</th>
                                                <th>Quantity</th>
                                                <th>Status</th>
                                                <th>Assigned Project</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {(resourceReport.resources || []).map(
                                                (resource) => (
                                                    <tr key={resource._id}>
                                                        <td>{resource.name}</td>
                                                        <td>{resource.type}</td>
                                                        <td>{resource.category}</td>
                                                        <td>
                                                            {resource.quantity} {resource.unit}
                                                        </td>
                                                        <td>{resource.status}</td>
                                                        <td>
                                                            {getProjectName(resource.assignedProject)}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                            </div>
                        )}

                        {activeTab === "material" && (
                            <div className="report-section">

                                <h2>Material Consumption Report</h2>

                                <p className="report-description">
                                    Track the quantity of materials consumed
                                    by each construction project.
                                </p>

                                <div className="report-mini-stats">
                                    <div>
                                        <span>Consumption Records</span>
                                        <strong>
                                            {consumptionRecords.length}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Material Groups</span>
                                        <strong>{materialReport.length}</strong>
                                    </div>

                                    <div>
                                        <span>Total Records in Report</span>
                                        <strong>
                                            {materialReport.reduce(
                                                (total, item) =>
                                                    total + (item.recordCount || 0),
                                                0
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <h3>Material Consumption Summary</h3>

                                <div className="table-responsive">
                                    <table className="project-table">
                                        <thead>
                                            <tr>
                                                <th>Project</th>
                                                <th>Material</th>
                                                <th>Total Consumed</th>
                                                <th>Unit</th>
                                                <th>Record Count</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {materialReport.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5">
                                                        No material consumption data found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                materialReport.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.projectName}</td>
                                                        <td>{item.materialName}</td>
                                                        <td>{item.totalConsumed}</td>
                                                        <td>{item.unit}</td>
                                                        <td>{item.recordCount}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <h3 className="report-subheading">
                                    Record Material Consumption
                                </h3>

                                <form
                                    className="report-consumption-form"
                                    onSubmit={handleConsumptionSubmit}
                                >
                                    <div className="form-grid">

                                        <label>
                                            Project
                                            <select
                                                name="project"
                                                value={formData.project}
                                                onChange={handleChange}
                                                required
                                            >
                                                <option value="">
                                                    Select Project
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
                                            Material Resource (Optional)
                                            <select
                                                name="resource"
                                                value={formData.resource}
                                                onChange={handleChange}
                                            >
                                                <option value="">
                                                    Select Material Resource
                                                </option>

                                                {resources.map((resource) => (
                                                    <option
                                                        key={resource._id}
                                                        value={resource._id}
                                                    >
                                                        {resource.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label>
                                            Material Name
                                            <input
                                                type="text"
                                                name="materialName"
                                                value={formData.materialName}
                                                onChange={handleChange}
                                                placeholder="Example: Cement"
                                                required
                                            />
                                        </label>

                                        <label>
                                            Quantity Consumed
                                            <input
                                                type="number"
                                                name="quantityConsumed"
                                                value={formData.quantityConsumed}
                                                onChange={handleChange}
                                                placeholder="Enter quantity"
                                                min="0"
                                                step="any"
                                                required
                                            />
                                        </label>

                                        <label>
                                            Unit
                                            <input
                                                type="text"
                                                name="unit"
                                                value={formData.unit}
                                                onChange={handleChange}
                                                placeholder="Bags, kg, pieces..."
                                                required
                                            />
                                        </label>

                                        <label>
                                            Date
                                            <input
                                                type="date"
                                                name="date"
                                                value={formData.date}
                                                onChange={handleChange}
                                                required
                                            />
                                        </label>

                                        <label>
                                            Recorded By
                                            <input
                                                type="text"
                                                name="recordedBy"
                                                value={formData.recordedBy}
                                                onChange={handleChange}
                                                placeholder="Enter your name"
                                                required
                                            />
                                        </label>

                                        <label>
                                            Notes
                                            <input
                                                type="text"
                                                name="notes"
                                                value={formData.notes}
                                                onChange={handleChange}
                                                placeholder="Optional notes"
                                            />
                                        </label>

                                    </div>

                                    <button
                                        type="submit"
                                        className="primary-button"
                                    >
                                        Record Consumption
                                    </button>
                                </form>

                                <h3 className="report-subheading">
                                    Material Consumption Records
                                </h3>

                                <div className="table-responsive">
                                    <table className="project-table">
                                        <thead>
                                            <tr>
                                                <th>Project</th>
                                                <th>Material</th>
                                                <th>Quantity</th>
                                                <th>Date</th>
                                                <th>Recorded By</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {consumptionRecords.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6">
                                                        No consumption records found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                consumptionRecords.map((record) => (
                                                    <tr key={record._id}>
                                                        <td>
                                                            {getProjectName(record.project)}
                                                        </td>
                                                        <td>{record.materialName}</td>
                                                        <td>
                                                            {record.quantityConsumed} {record.unit}
                                                        </td>
                                                        <td>{formatDate(record.date)}</td>
                                                        <td>{record.recordedBy}</td>
                                                        <td>{record.notes || "-"}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                            </div>
                        )}

                        {activeTab === "milestone" && (
                            <div className="report-section">

                                <h2>Milestone Status Report</h2>

                                <p className="report-description">
                                    Monitor milestone completion, upcoming
                                    deadlines and overdue milestones.
                                </p>

                                <div className="report-mini-stats">
                                    <div>
                                        <span>Total Milestones</span>
                                        <strong>
                                            {milestoneReport.totalMilestones || 0}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Overdue Milestones</span>
                                        <strong className="report-warning">
                                            {milestoneReport.overdueCount || 0}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Completed Milestones</span>
                                        <strong>
                                            {(milestoneReport.statusBreakdown || [])
                                                .find((item) => item._id === "Completed")
                                                ?.count || 0}
                                        </strong>
                                    </div>
                                </div>

                                <h3>Status Breakdown</h3>

                                <div className="table-responsive">
                                    <table className="project-table">
                                        <thead>
                                            <tr>
                                                <th>Status</th>
                                                <th>Milestone Count</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {(milestoneReport.statusBreakdown || []).map(
                                                (item, index) => (
                                                    <tr key={index}>
                                                        <td>{item._id}</td>
                                                        <td>{item.count}</td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <h3 className="report-subheading">
                                    All Milestones
                                </h3>

                                <div className="table-responsive">
                                    <table className="project-table">
                                        <thead>
                                            <tr>
                                                <th>Milestone</th>
                                                <th>Project</th>
                                                <th>Due Date</th>
                                                <th>Status</th>
                                                <th>Progress</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {(milestoneReport.milestones || []).map(
                                                (milestone) => (
                                                    <tr key={milestone._id}>
                                                        <td>
                                                            {milestone.title || milestone.name}
                                                        </td>
                                                        <td>
                                                            {getProjectName(milestone.project)}
                                                        </td>
                                                        <td>{formatDate(milestone.dueDate)}</td>
                                                        <td>{milestone.status}</td>
                                                        <td>
                                                            {milestone.progress ?? 0}%
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <h3 className="report-subheading">
                                    Overdue Milestones
                                </h3>

                                <div className="table-responsive">
                                    <table className="project-table">
                                        <thead>
                                            <tr>
                                                <th>Milestone</th>
                                                <th>Project</th>
                                                <th>Due Date</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {(milestoneReport.overdueMilestones || []).length === 0 ? (
                                                <tr>
                                                    <td colSpan="4">
                                                        No overdue milestones.
                                                    </td>
                                                </tr>
                                            ) : (
                                                milestoneReport.overdueMilestones.map(
                                                    (milestone) => (
                                                        <tr key={milestone._id}>
                                                            <td>
                                                                {milestone.title || milestone.name}
                                                            </td>
                                                            <td>
                                                                {getProjectName(milestone.project)}
                                                            </td>
                                                            <td>{formatDate(milestone.dueDate)}</td>
                                                            <td>{milestone.status}</td>
                                                        </tr>
                                                    )
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                            </div>
                        )}

                    </div>
                </>
            )}

        </div>
    );
}

export default Reports;
