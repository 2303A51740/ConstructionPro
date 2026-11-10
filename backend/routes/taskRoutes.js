
const express = require("express");
const router = express.Router();

const Task = require("../models/Task");
const Milestone = require("../models/Milestone");
const Project = require("../models/Project");
const User = require("../models/User");

const { authorizeRoles } = require("../middleware/authorizeRoles");

// User roles
const allRoles = [
    "Admin",
    "Project Manager",
    "Site Engineer",
    "Contractor",
    "Store Manager"
];

const managementRoles = [
    "Admin",
    "Project Manager"
];

const progressRoles = [
    "Admin",
    "Project Manager",
    "Site Engineer",
    "Contractor"
];

// Validate task assignment
const validateTaskAssignee = async (userId, projectId) => {
    const user = await User.findOne({
        _id: userId,
        isActive: true,
        role: { $in: ["Site Engineer", "Contractor"] }
    });

    if (!user) {
        throw new Error(
            "Assigned user must be an active Site Engineer or Contractor."
        );
    }

    const project = await Project.findById(projectId);

    if (!project) {
        throw new Error("Project not found.");
    }

    const assignedUsers =
        user.role === "Site Engineer"
            ? project.siteEngineers
            : project.contractors;

    const isProjectAssigned = assignedUsers.some(
        id => id.toString() === user._id.toString()
    );

    if (!isProjectAssigned) {
        throw new Error(
            `${user.role} must be assigned to the project before receiving tasks.`
        );
    }

    return user;
};

// Check task assignment
const isAssignedTask = (task, user) => {
    if (task.assignedUser) {
        const assignedUserId =
            task.assignedUser._id || task.assignedUser;

        return assignedUserId.toString() === user._id.toString();
    }

    return task.assignedTo === user.fullName;
};

// Get task filter based on role
const getTaskFilter = (user) => {
    if (
        user.role === "Site Engineer" ||
        user.role === "Contractor"
    ) {
        return {
            $or: [
                { assignedUser: user._id },
                {
                    assignedUser: null,
                    assignedTo: user.fullName
                }
            ]
        };
    }

    return {};
};

// Synchronize task progress with status
const getTaskProgress = (status, progress) => {
    if (status === "Pending") return 0;

    if (status === "Completed") return 100;

    const value = Number(progress ?? 0);

    if (!Number.isFinite(value) || value < 0 || value > 99) {
        throw new Error(
            "Progress must be between 0 and 99 for this status."
        );
    }

    return value;
};

// Recalculate project progress
const updateProjectProgress = async (projectId) => {
    const [tasks, milestones] = await Promise.all([
        Task.find({ project: projectId }).select("progress"),
        Milestone.find({ project: projectId }).select("progress")
    ]);

    const items = [...tasks, ...milestones];

    const progress =
        items.length === 0
            ? 0
            : Math.round(
                items.reduce(
                    (total, item) => total + (item.progress || 0),
                    0
                ) / items.length
            );

    await Project.findByIdAndUpdate(projectId, { progress });
};

// CREATE TASK
// Only Admin and Project Manager
router.post("/", authorizeRoles(...managementRoles), async (req, res) => {
    try {
        const projectExists = await Project.findById(req.body.project);

        if (!projectExists) {
            return res.status(404).json({
                success: false,
                message: "Project not found. Create a project first."
            });
        }

        const taskData = { ...req.body };

        // Validate assigned user
        if (taskData.assignedUser) {
            const assignedUser = await validateTaskAssignee(
                taskData.assignedUser,
                taskData.project
            );

            taskData.assignedTo = assignedUser.fullName;
        }

        taskData.progress = getTaskProgress(
            taskData.status || "Pending",
            taskData.progress
        );

        const task = await Task.create(taskData);

        await updateProjectProgress(task.project);

        const createdTask = await Task.findById(task._id)
            .populate("project", "projectName")
            .populate("assignedUser", "fullName email role");

        res.status(201).json({
            success: true,
            message: "Task created successfully",
            task: createdTask
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// GET ALL TASKS
// All five roles
router.get("/", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const filter = {
            ...getTaskFilter(req.user)
        };

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.project) {
            filter.project = req.query.project;
        }

        const tasks = await Task.find(filter)
            .populate("project", "projectName")
            .populate("assignedUser", "fullName email role")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: tasks.length,
            tasks
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET TASK BY ID
router.get("/:id", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate("project", "projectName")
            .populate("assignedUser", "fullName email role");

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        if (
            (req.user.role === "Site Engineer" ||
                req.user.role === "Contractor") &&
            !isAssignedTask(task, req.user)
        ) {
            return res.status(403).json({
                success: false,
                message: "You can only access your assigned tasks."
            });
        }

        res.json({
            success: true,
            task
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid task ID"
        });
    }
});

// UPDATE TASK
// Admin and Project Manager can update all fields
// Site Engineer and Contractor can update status and progress
router.put("/:id", authorizeRoles(...progressRoles), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        const isProgressUser =
            req.user.role === "Site Engineer" ||
            req.user.role === "Contractor";

        if (isProgressUser && !isAssignedTask(task, req.user)) {
            return res.status(403).json({
                success: false,
                message: "You can only update your assigned tasks."
            });
        }

        // Restrict progress users to status and progress
        const updateData = isProgressUser
            ? {
                ...(req.body.status !== undefined && {
                    status: req.body.status
                }),
                ...(req.body.progress !== undefined && {
                    progress: req.body.progress
                })
            }
            : { ...req.body };

        const previousProjectId = task.project.toString();

        const targetProjectId =
            updateData.project || task.project;

        const targetAssignee =
            updateData.assignedUser !== undefined
                ? updateData.assignedUser
                : task.assignedUser;

        // Validate new assignment
        if (targetAssignee) {
            const assignedUser = await validateTaskAssignee(
                targetAssignee,
                targetProjectId
            );

            updateData.assignedTo = assignedUser.fullName;
        } else if (updateData.assignedUser === null) {
            updateData.assignedTo = "";
        }

        const newStatus = updateData.status ?? task.status;
        const newProgress = updateData.progress ?? task.progress;

        updateData.progress = getTaskProgress(
            newStatus,
            newProgress
        );

        Object.assign(task, updateData);

        await task.save();

        // Update current project progress
        await updateProjectProgress(task.project);

        // Update previous project if task was moved
        const newProjectId = task.project.toString();

        if (previousProjectId !== newProjectId) {
            await updateProjectProgress(previousProjectId);
        }

        const updatedTask = await Task.findById(task._id)
            .populate("project", "projectName")
            .populate("assignedUser", "fullName email role");

        res.json({
            success: true,
            message: "Task updated successfully",
            task: updatedTask
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE TASK
// Only Admin and Project Manager
router.delete("/:id", authorizeRoles(...managementRoles), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        const projectId = task.project;

        await Task.findByIdAndDelete(req.params.id);

        await updateProjectProgress(projectId);

        res.json({
            success: true,
            message: "Task deleted successfully"
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
