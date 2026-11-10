
const express = require("express");
const router = express.Router();

const Milestone = require("../models/Milestone");
const Task = require("../models/Task");
const Project = require("../models/Project");

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
    "Site Engineer"
];

// Check whether a project is assigned to the logged-in user
const isAssignedProject = async (projectId, user) => {
    const project = await Project.findOne({
        _id: projectId,
        siteEngineers: user._id
    });

    return Boolean(project);
};

// Get project IDs visible to the logged-in user
const getMilestoneProjectFilter = async (user) => {
    if (user.role === "Site Engineer") {
        const projects = await Project.find({
            siteEngineers: user._id
        }).select("_id");

        return {
            project: {
                $in: projects.map(project => project._id)
            }
        };
    }

    if (user.role === "Contractor") {
        const projects = await Project.find({
            contractors: user._id
        }).select("_id");

        return {
            project: {
                $in: projects.map(project => project._id)
            }
        };
    }

    return {};
};

// Synchronize milestone progress with status
const getMilestoneProgress = (status, progress) => {
    if (status === "Pending") return 0;
    if (status === "Completed") return 100;

    const value = Number(progress ?? 0);

    if (!Number.isFinite(value) || value < 0 || value > 99) {
        throw new Error("Progress must be between 0 and 99 for this status.");
    }

    return value;
};

// Recalculate project progress using tasks and milestones
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
                items.reduce((total, item) => total + item.progress, 0) /
                items.length
            );

    await Project.findByIdAndUpdate(projectId, { progress });
};

// CREATE milestone
// Only Admin and Project Manager
router.post("/", authorizeRoles(...managementRoles), async (req, res) => {
    try {
        const projectExists = await Project.findById(req.body.project);

        if (!projectExists) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        const milestoneData = { ...req.body };

        milestoneData.status = milestoneData.status || "Pending";

        milestoneData.progress = getMilestoneProgress(
            milestoneData.status,
            milestoneData.progress
        );

        milestoneData.completedDate =
            milestoneData.status === "Completed"
                ? new Date()
                : null;

        const milestone = await Milestone.create(milestoneData);

        await updateProjectProgress(milestone.project);

        res.status(201).json({
            success: true,
            message: "Milestone created successfully",
            milestone
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// GET all milestones
// All five roles
// Site Engineers and Contractors see assigned projects only
router.get("/", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const filter = await getMilestoneProjectFilter(req.user);

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.project) {
            filter.project = req.query.project;

            if (
                req.user.role === "Site Engineer" ||
                req.user.role === "Contractor"
            ) {
                const hasAccess = await Project.exists({
                    _id: req.query.project,
                    ...(req.user.role === "Site Engineer"
                        ? { siteEngineers: req.user._id }
                        : { contractors: req.user._id })
                });

                if (!hasAccess) {
                    return res.status(403).json({
                        success: false,
                        message: "You do not have access to this project's milestones."
                    });
                }
            }
        }

        const milestones = await Milestone.find(filter)
            .populate("project", "projectName")
            .sort({ dueDate: 1 });

        res.json({
            success: true,
            count: milestones.length,
            milestones
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET milestone by ID
// All five roles, with project assignment restrictions
router.get("/:id", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id)
            .populate("project", "projectName");

        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: "Milestone not found"
            });
        }

        if (
            req.user.role === "Site Engineer" ||
            req.user.role === "Contractor"
        ) {
            const project = await Project.findOne({
                _id: milestone.project._id,
                ...(req.user.role === "Site Engineer"
                    ? { siteEngineers: req.user._id }
                    : { contractors: req.user._id })
            });

            if (!project) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this milestone."
                });
            }
        }

        res.json({
            success: true,
            milestone
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid milestone ID"
        });
    }
});

// UPDATE milestone
// Admin, Project Manager and assigned Site Engineer
router.put("/:id", authorizeRoles(...progressRoles), async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);

        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: "Milestone not found"
            });
        }

        const isSiteEngineer = req.user.role === "Site Engineer";

        // Site Engineer can update milestones only in assigned projects
        if (isSiteEngineer) {
            const hasAccess = await isAssignedProject(
                milestone.project,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You can only update milestones in your assigned projects."
                });
            }
        }

        // Site Engineer can only update status and progress
        const updateData = isSiteEngineer
            ? {
                ...(req.body.status !== undefined && {
                    status: req.body.status
                }),
                ...(req.body.progress !== undefined && {
                    progress: req.body.progress
                })
            }
            : { ...req.body };

        const newStatus = updateData.status ?? milestone.status;
        const newProgress = updateData.progress ?? milestone.progress;

        updateData.progress = getMilestoneProgress(
            newStatus,
            newProgress
        );

        if (newStatus === "Completed") {
            updateData.completedDate =
                milestone.status === "Completed" && milestone.completedDate
                    ? milestone.completedDate
                    : new Date();
        } else {
            updateData.completedDate = null;
        }

        Object.assign(milestone, updateData);

        await milestone.save();

        await updateProjectProgress(milestone.project);

        const updatedMilestone = await Milestone.findById(milestone._id)
            .populate("project", "projectName");

        res.json({
            success: true,
            message: "Milestone updated successfully",
            milestone: updatedMilestone
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE milestone
// Only Admin and Project Manager
router.delete("/:id", authorizeRoles(...managementRoles), async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);

        if (!milestone) {
            return res.status(404).json({
                success: false,
                message: "Milestone not found"
            });
        }

        const projectId = milestone.project;

        await Milestone.findByIdAndDelete(req.params.id);

        await updateProjectProgress(projectId);

        res.json({
            success: true,
            message: "Milestone deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
