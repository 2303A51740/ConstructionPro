
import { useEffect, useState } from "react";
import api from "../services/api";

function CostManagement() {
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [formData, setFormData] = useState({
        project: "",
        title: "",
        category: "Material",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        recordedBy: ""
    });

    const categories = [
        "Material",
        "Labor",
        "Equipment",
        "Transportation",
        "Other"
    ];

    const getList = (data, key) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.[key])) return data[key];
        return [];
    };

    const role = user?.role || "";

    const isSiteEngineer = role === "Site Engineer";
    const isProjectManager = role === "Project Manager";
    const isAdmin = role === "Admin";

    const canSubmit = [
        "Admin",
        "Project Manager",
        "Site Engineer",
        "Store Manager"
    ].includes(role);

    const canReview = isAdmin || isProjectManager;
    const canDelete = isAdmin || isProjectManager;

    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");

            const [expenseResponse, projectResponse] = await Promise.all([
                api.get("/expenses"),
                api.get("/projects")
            ]);

            setExpenses(getList(expenseResponse.data, "expenses"));

            let projectList = getList(projectResponse.data, "projects");

            if (isProjectManager) {
                projectList = projectList.filter(
                    project =>
                        project.projectManager === user.fullName
                );
            }

            setProjects(projectList);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load cost management data."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const savedUser = localStorage.getItem("user");

        if (savedUser) {
            try {
                const currentUser = JSON.parse(savedUser);

                setUser(currentUser);

                setFormData(previous => ({
                    ...previous,
                    recordedBy:
                        currentUser.fullName ||
                        currentUser.name ||
                        currentUser.email ||
                        ""
                }));
            } catch {
                setError("Unable to read user information.");
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(previous => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        try {
            const expenseData = {
                project: formData.project,
                title: formData.title,
                category: formData.category,
                amount: Number(formData.amount),
                date: formData.date,
                description: formData.description
            };

            const response = await api.post("/expenses", expenseData);

            setSuccess(
                response.data.message ||
                (isSiteEngineer
                    ? "Expense submitted for approval!"
                    : "Expense added successfully!")
            );

            setFormData(previous => ({
                ...previous,
                project: "",
                title: "",
                category: "Material",
                amount: "",
                date: new Date().toISOString().split("T")[0],
                description: ""
            }));

            await fetchData();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to add expense. Please check the details."
            );
        }
    };

    const handleReview = async (expense, status) => {
        let rejectionReason = "";

        if (status === "Rejected") {
            rejectionReason = window.prompt(
                "Enter the reason for rejecting this expense:"
            );

            if (rejectionReason === null) return;

            if (!rejectionReason.trim()) {
                setError("Please provide a rejection reason.");
                return;
            }
        }

        try {
            setError("");
            setSuccess("");

            const response = await api.patch(
                `/expenses/${expense._id}/review`,
                {
                    status,
                    rejectionReason
                }
            );

            setSuccess(
                response.data.message ||
                `Expense ${status.toLowerCase()} successfully.`
            );

            await fetchData();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to review expense."
            );
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense?")) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await api.delete(`/expenses/${id}`);

            setExpenses(previous =>
                previous.filter(expense => expense._id !== id)
            );

            setSuccess("Expense deleted successfully!");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to delete expense."
            );
        }
    };

    const isApproved = expense =>
        expense.status === "Approved" || !expense.status;

    const approvedExpenses = expenses.filter(isApproved);

    const pendingExpenses = expenses.filter(
        expense => expense.status === "Pending"
    );

    const rejectedExpenses = expenses.filter(
        expense => expense.status === "Rejected"
    );

    const totalExpenses = approvedExpenses.reduce(
        (total, expense) =>
            total + Number(expense.amount || 0),
        0
    );

    const getCategoryTotal = (category) => {
        return approvedExpenses
            .filter(expense => expense.category === category)
            .reduce(
                (total, expense) =>
                    total + Number(expense.amount || 0),
                0
            );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const getProjectName = (project) => {
        if (!project) return "Unknown Project";

        if (typeof project === "object") {
            return project.projectName || "Unknown Project";
        }

        return projects.find(
            item => item._id === project
        )?.projectName || "Unknown Project";
    };

    const getStatusClass = (status) => {
        if (status === "Approved") return "status-approved";
        if (status === "Rejected") return "status-rejected";
        return "status-pending";
    };

    return (
        <div className="dashboard-content">

            <div className="dashboard-heading">
                <div>
                    <h1>Cost Management</h1>
                    <p>
                        Track construction expenses and project spending.
                    </p>
                </div>
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

            {/* ORIGINAL STATISTICS CARDS */}

            <div className="stats-grid">

                <div className="stat-card">
                    <div className="stat-info">
                        <p>Total Expenses</p>
                        <h2>{formatCurrency(totalExpenses)}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <p>Material Expenses</p>
                        <h2>
                            {formatCurrency(getCategoryTotal("Material"))}
                        </h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <p>Labor Expenses</p>
                        <h2>
                            {formatCurrency(getCategoryTotal("Labor"))}
                        </h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <p>Equipment Expenses</p>
                        <h2>
                            {formatCurrency(getCategoryTotal("Equipment"))}
                        </h2>
                    </div>
                </div>

            </div>

            {/* APPROVAL SUMMARY */}

            <div className="stats-grid">

                <div className="stat-card">
                    <div className="stat-info">
                        <p>Pending Requests</p>
                        <h2>{pendingExpenses.length}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <p>Approved Requests</p>
                        <h2>{approvedExpenses.length}</h2>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <p>Rejected Requests</p>
                        <h2>{rejectedExpenses.length}</h2>
                    </div>
                </div>

            </div>

            {/* ADD / SUBMIT EXPENSE */}

            {canSubmit && (
                <div className="dashboard-panel">

                    <h2>
                        {isSiteEngineer
                            ? "Submit Project Expense"
                            : "Add New Expense"}
                    </h2>

                    {isSiteEngineer && (
                        <p>
                            Your expense will be sent to the Project Manager
                            for approval.
                        </p>
                    )}

                    <form
                        className="project-form"
                        onSubmit={handleSubmit}
                    >

                        <div className="form-grid">

                            <div className="form-group">
                                <label>Project</label>

                                <select
                                    name="project"
                                    value={formData.project}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">
                                        Select Project
                                    </option>

                                    {projects.map(project => (
                                        <option
                                            key={project._id}
                                            value={project._id}
                                        >
                                            {project.projectName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Expense Title</label>

                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Enter expense title"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Category</label>

                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                >
                                    {categories.map(category => (
                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Amount (₹)</label>

                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    placeholder="Enter amount"
                                    min="0.01"
                                    step="0.01"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Expense Date</label>

                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Recorded By</label>

                                <input
                                    type="text"
                                    name="recordedBy"
                                    value={formData.recordedBy}
                                    readOnly
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Description</label>

                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Enter expense description"
                                    rows="3"
                                />
                            </div>

                        </div>

                        <button
                            type="submit"
                            className="primary-btn"
                            disabled={projects.length === 0}
                        >
                            {isSiteEngineer
                                ? "Submit for Approval"
                                : "Add Expense"}
                        </button>

                    </form>
                </div>
            )}

            {/* PROJECT MANAGER / ADMIN APPROVAL CENTER */}

            {canReview && (
                <div className="dashboard-panel">

                    <div className="project-toolbar">
                        <h2>Expense Approval Center</h2>
                        <span>
                            {pendingExpenses.length} Pending Requests
                        </span>
                    </div>

                    {pendingExpenses.length === 0 ? (
                        <p>No pending expense requests.</p>
                    ) : (
                        <div className="table-responsive">

                            <table className="project-table">

                                <thead>
                                    <tr>
                                        <th>Expense</th>
                                        <th>Project</th>
                                        <th>Submitted By</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {pendingExpenses.map(expense => (
                                        <tr key={expense._id}>

                                            <td>
                                                <strong>{expense.title}</strong>
                                                <br />
                                                <small>{expense.category}</small>
                                                <br />
                                                <small>{expense.description}</small>
                                            </td>

                                            <td>
                                                {getProjectName(expense.project)}
                                            </td>

                                            <td>
                                                {expense.submittedBy?.fullName ||
                                                    expense.recordedBy}
                                            </td>

                                            <td>
                                                <strong>
                                                    {formatCurrency(expense.amount)}
                                                </strong>
                                            </td>

                                            <td>
                                                {expense.date
                                                    ? new Date(expense.date).toLocaleDateString("en-IN")
                                                    : "-"}
                                            </td>

                                            <td>
                                                <div className="project-actions">

                                                    <button
                                                        type="button"
                                                        className="primary-btn"
                                                        onClick={() =>
                                                            handleReview(expense, "Approved")
                                                        }
                                                    >
                                                        Approve
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="delete-btn"
                                                        onClick={() =>
                                                            handleReview(expense, "Rejected")
                                                        }
                                                    >
                                                        Reject
                                                    </button>

                                                </div>
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>

                            </table>

                        </div>
                    )}
                </div>
            )}

            {/* ORIGINAL LATEST EXPENSES SECTION - PRESERVED */}

            <div className="dashboard-panel">

                <div className="project-toolbar">
                    <h2>Latest Expenses</h2>
                    <span>{expenses.length} Records</span>
                </div>

                {loading ? (
                    <p>Loading expenses...</p>
                ) : expenses.length === 0 ? (
                    <p>No expense records found.</p>
                ) : (
                    <div className="table-responsive">

                        <table className="project-table">

                            <thead>
                                <tr>
                                    <th>Expense</th>
                                    <th>Project</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Recorded By</th>
                                    <th>Status</th>
                                    <th>Review Details</th>
                                    {canDelete && <th>Action</th>}
                                </tr>
                            </thead>

                            <tbody>
                                {expenses.map(expense => (
                                    <tr key={expense._id}>

                                        <td>
                                            <strong>{expense.title}</strong>
                                            <br />
                                            <small>{expense.description}</small>
                                        </td>

                                        <td>
                                            {getProjectName(expense.project)}
                                        </td>

                                        <td>
                                            <span className="status-badge">
                                                {expense.category}
                                            </span>
                                        </td>

                                        <td>
                                            <strong>
                                                {formatCurrency(expense.amount)}
                                            </strong>
                                        </td>

                                        <td>
                                            {expense.date
                                                ? new Date(expense.date).toLocaleDateString("en-IN")
                                                : "-"}
                                        </td>

                                        <td>{expense.recordedBy}</td>

                                        <td>
                                            <span
                                                className={`status-badge ${getStatusClass(
                                                    expense.status || "Approved"
                                                )}`}
                                            >
                                                {expense.status || "Approved"}
                                            </span>
                                        </td>

                                        <td>
                                            {expense.status === "Pending" ? (
                                                <small>Awaiting approval</small>
                                            ) : expense.status === "Rejected" ? (
                                                <div>
                                                    <strong>Reason:</strong>
                                                    <br />
                                                    <small>
                                                        {expense.rejectionReason ||
                                                            "No reason provided"}
                                                    </small>
                                                </div>
                                            ) : (
                                                <small>
                                                    {expense.reviewedBy?.fullName
                                                        ? `Reviewed by ${expense.reviewedBy.fullName}`
                                                        : "Approved"}
                                                </small>
                                            )}
                                        </td>

                                        {canDelete && (
                                            <td>
                                                <button
                                                    type="button"
                                                    className="delete-btn"
                                                    onClick={() =>
                                                        handleDelete(expense._id)
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        )}

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

export default CostManagement;
