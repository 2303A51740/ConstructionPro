
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const { protect } = require("./middleware/authMiddleware");

const projectRoutes = require("./routes/projectRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const taskRoutes = require("./routes/taskRoutes");
const milestoneRoutes = require("./routes/milestoneRoutes");
const dailyProgressRoutes = require("./routes/dailyProgressRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Public authentication routes
app.use("/api/auth", authRoutes);

// Protected management routes
app.use("/api/projects", protect, projectRoutes);
app.use("/api/resources", protect, resourceRoutes);
app.use("/api/tasks", protect, taskRoutes);
app.use("/api/milestones", protect, milestoneRoutes);
app.use("/api/daily-progress", protect, dailyProgressRoutes);
app.use("/api/expenses", protect, expenseRoutes);
app.use("/api/reports", protect, reportRoutes);
app.use("/api/dashboard", protect, dashboardRoutes);

// Home route
app.get("/", (req, res) => {
    res.send("Construction Management API is running!");
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Backend and API are working successfully"
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log("Authentication API: /api/auth");
            console.log("Project API: /api/projects");
            console.log("Resource API: /api/resources");
            console.log("Task API: /api/tasks");
            console.log("Milestone API: /api/milestones");
            console.log("Daily Progress API: /api/daily-progress");
            console.log("Expense API: /api/expenses");
            console.log("Reports API: /api/reports");
            console.log("Dashboard API: /api/dashboard");
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
