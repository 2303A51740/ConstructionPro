
import { useEffect, useState } from "react";
import {
    Plus,
    Users,
    UserCheck,
    UserX,
    RefreshCw,
    Trash2,
    ShieldCheck,
    Search
} from "lucide-react";
import api from "../services/api";

const roles = [
    "Admin",
    "Project Manager",
    "Site Engineer",
    "Contractor",
    "Store Manager"
];

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");
    const [deletingUser, setDeletingUser] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        role: "Site Engineer",
        phone: ""
    });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/auth/users");
            setUsers(response.data.users || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load users. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentUser = async () => {
        try {
            const response = await api.get("/auth/me");
            setCurrentUserId(
                response.data.user?._id ||
                response.data.user?.id ||
                ""
            );
        } catch (err) {
            console.error("Unable to identify current user");
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchCurrentUser();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setError("");
            setSuccess("");

            const response = await api.post("/auth/register", formData);

            setSuccess(
                response.data.message || "User registered successfully."
            );

            setFormData({
                fullName: "",
                email: "",
                password: "",
                role: "Site Engineer",
                phone: ""
            });

            setShowForm(false);
            await fetchUsers();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to register user."
            );
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            setError("");
            setSuccess("");

            const response = await api.patch(
                `/auth/users/${userId}/role`,
                { role: newRole }
            );

            setSuccess(
                response.data.message || "User role updated successfully."
            );

            await fetchUsers();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update user role."
            );

            await fetchUsers();
        }
    };

    const handleStatusChange = async (user) => {
        try {
            setError("");
            setSuccess("");

            const response = await api.patch(
                `/auth/users/${user._id}/status`,
                { isActive: !user.isActive }
            );

            setSuccess(
                response.data.message || "User status updated successfully."
            );

            await fetchUsers();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update account status."
            );
        }
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;

        try {
            setDeleteLoading(true);
            setError("");
            setSuccess("");

            const response = await api.delete(
                `/auth/users/${deletingUser._id}`
            );

            setSuccess(
                response.data.message || "User permanently deleted."
            );

            setDeletingUser(null);
            await fetchUsers();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to delete user."
            );
        } finally {
            setDeleteLoading(false);
        }
    };

    const activeUsers = users.filter((user) => user.isActive).length;
    const inactiveUsers = users.length - activeUsers;
    const adminUsers = users.filter((user) => user.role === "Admin").length;

    const filteredUsers = users.filter((user) => {
        const search = searchTerm.toLowerCase();

        return (
            user.fullName?.toLowerCase().includes(search) ||
            user.email?.toLowerCase().includes(search) ||
            user.role?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="dashboard-content">

            <div className="dashboard-heading">
                <div>
                    <h1>User Management</h1>
                    <p>Manage system users, roles and account access.</p>
                </div>

                <button
                    className="primary-btn"
                    onClick={() => {
                        setShowForm(!showForm);
                        setError("");
                        setSuccess("");
                    }}
                >
                    <Plus size={16} />
                    {showForm ? "Close Form" : "Add New User"}
                </button>
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

            <div className="stats-grid">

                <div className="stat-card">
                    <div className="stat-icon">
                        <Users size={22} />
                    </div>
                    <p>Total Users</p>
                    <h2>{users.length}</h2>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <UserCheck size={22} />
                    </div>
                    <p>Active Users</p>
                    <h2>{activeUsers}</h2>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <UserX size={22} />
                    </div>
                    <p>Inactive Users</p>
                    <h2>{inactiveUsers}</h2>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <ShieldCheck size={22} />
                    </div>
                    <p>Administrators</p>
                    <h2>{adminUsers}</h2>
                </div>

            </div>

            {showForm && (
                <div className="dashboard-panel">
                    <h2>
                        <Plus size={18} />
                        Register New User
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">

                            <label>
                                Full Name
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Enter full name"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label>
                                Email Address
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter email address"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label>
                                Password
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Minimum 6 characters"
                                    value={formData.password}
                                    onChange={handleChange}
                                    minLength={6}
                                    required
                                />
                            </label>

                            <label>
                                Phone Number
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="Enter phone number"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </label>

                            <label>
                                Assign Role
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                >
                                    {roles.map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                            </label>

                        </div>

                        <button type="submit" className="primary-btn">
                            <Plus size={16} />
                            Register User
                        </button>
                    </form>
                </div>
            )}

            <div className="dashboard-panel">

                <div className="project-toolbar">
                    <h2>Registered Users</h2>

                    <div style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap"
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            border: "1px solid #dce3ed",
                            borderRadius: "9px",
                            padding: "0 12px",
                            background: "#fff"
                        }}>
                            <Search size={16} color="#77869b" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    border: "none",
                                    outline: "none",
                                    padding: "10px 0",
                                    width: "160px"
                                }}
                            />
                        </div>

                        <button
                            className="primary-btn"
                            onClick={fetchUsers}
                        >
                            <RefreshCw size={15} />
                            Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="dashboard-message">
                        Loading users...
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="dashboard-message">
                        No users found.
                    </div>
                ) : (

                    <div className="table-responsive">
                        <table className="project-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Role</th>
                                    <th>Account Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredUsers.map((user) => {
                                    const isCurrentUser =
                                        String(user._id) === String(currentUserId);

                                    return (
                                        <tr key={user._id}>
                                            <td>{user.fullName}</td>

                                            <td>{user.email}</td>

                                            <td>
                                                {user.phone || "Not provided"}
                                            </td>

                                            <td>
                                                <select
                                                    value={user.role}
                                                    disabled={isCurrentUser}
                                                    onChange={(e) =>
                                                        handleRoleChange(
                                                            user._id,
                                                            e.target.value
                                                        )
                                                    }
                                                >
                                                    {roles.map((role) => (
                                                        <option
                                                            key={role}
                                                            value={role}
                                                        >
                                                            {role}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td>
                                                <span
                                                    className="status-badge"
                                                    style={{
                                                        background: user.isActive
                                                            ? "#e7f6ed"
                                                            : "#fff0f0",
                                                        color: user.isActive
                                                            ? "#218653"
                                                            : "#d93636"
                                                    }}
                                                >
                                                    {user.isActive
                                                        ? "Active"
                                                        : "Inactive"}
                                                </span>
                                            </td>

                                            <td>
                                                <div style={{
                                                    display: "flex",
                                                    gap: "7px",
                                                    flexWrap: "wrap"
                                                }}>
                                                    <button
                                                        className={
                                                            user.isActive
                                                                ? "delete-btn"
                                                                : "primary-btn"
                                                        }
                                                        disabled={isCurrentUser}
                                                        onClick={() =>
                                                            handleStatusChange(user)
                                                        }
                                                    >
                                                        {user.isActive
                                                            ? "Deactivate"
                                                            : "Activate"}
                                                    </button>

                                                    <button
                                                        className="delete-btn"
                                                        disabled={isCurrentUser}
                                                        onClick={() =>
                                                            setDeletingUser(user)
                                                        }
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "5px"
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>

            {deletingUser && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(10, 20, 35, 0.65)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div style={{
                        width: "100%",
                        maxWidth: "430px",
                        background: "#fff",
                        borderRadius: "18px",
                        padding: "30px",
                        boxShadow: "0 25px 70px rgba(0,0,0,0.25)"
                    }}>
                        <div style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "14px",
                            background: "#fff0f0",
                            color: "#d93636",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "18px"
                        }}>
                            <Trash2 size={23} />
                        </div>

                        <h2 style={{
                            fontSize: "21px",
                            marginBottom: "10px"
                        }}>
                            Permanently Delete User?
                        </h2>

                        <p style={{
                            color: "#66758a",
                            lineHeight: 1.7,
                            marginBottom: "10px"
                        }}>
                            Are you sure you want to permanently delete
                            this account?
                        </p>

                        <p style={{
                            fontWeight: 600,
                            marginBottom: "20px"
                        }}>
                            {deletingUser.fullName}
                            <br />
                            <span style={{
                                color: "#77869b",
                                fontWeight: 400,
                                fontSize: "13px"
                            }}>
                                {deletingUser.email}
                            </span>
                        </p>

                        <p style={{
                            color: "#d93636",
                            fontSize: "13px",
                            marginBottom: "22px"
                        }}>
                            This action cannot be undone.
                        </p>

                        <div style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "10px"
                        }}>
                            <button
                                className="primary-btn"
                                disabled={deleteLoading}
                                onClick={() => setDeletingUser(null)}
                            >
                                Cancel
                            </button>

                            <button
                                className="delete-btn"
                                disabled={deleteLoading}
                                onClick={handleDeleteUser}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <Trash2 size={15} />
                                {deleteLoading ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default UserManagement;
