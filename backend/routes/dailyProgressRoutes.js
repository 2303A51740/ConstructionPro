
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const DailyProgress = require("../models/DailyProgress");
const Project = require("../models/Project");
const Task = require("../models/Task");

const { authorizeRoles } = require("../middleware/authorizeRoles");

// User roles
const allRoles = [
    "Admin",
    "Project Manager",
    "Site Engineer",
    "Contractor",
    "Store Manager"
];

const progressManagementRoles = [
    "Admin",
    "Project Manager",
    "Site Engineer"
];

const deleteRoles = [
    "Admin",
    "Project Manager"
];

// Check whether a project is assigned to the logged-in user
const hasProjectAccess = async (projectId, user) => {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return false;
    }

    if (user.role === "Site Engineer") {
        return Boolean(await Project.exists({
            _id: projectId,
            siteEngineers: user._id
        }));
    }

    if (user.role === "Contractor") {
        return Boolean(await Project.exists({
            _id: projectId,
            contractors: user._id
        }));
    }

    return true;
};

// CREATE daily progress report
// Admin, Project Manager and assigned Site Engineer
router.post("/", authorizeRoles(...progressManagementRoles), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.body.project)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        const projectExists = await Project.findById(req.body.project);

        if (!projectExists) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        if (req.user.role === "Site Engineer") {
            const hasAccess = await hasProjectAccess(
                req.body.project,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You can only record progress for your assigned projects."
                });
            }
        }

        if (req.body.task) {
            if (!mongoose.Types.ObjectId.isValid(req.body.task)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid task ID"
                });
            }

            const taskExists = await Task.findOne({
                _id: req.body.task,
                project: req.body.project
            });

            if (!taskExists) {
                return res.status(404).json({
                    success: false,
                    message: "Task not found in this project"
                });
            }
        }

        const progressData = {
            ...req.body,
            recordedBy: req.user.fullName
        };

        const progress = await DailyProgress.create(progressData);

        res.status(201).json({
            success: true,
            message: "Daily progress recorded successfully",
            progress
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// GET all daily progress records with optional project filter
// All five roles
// Site Engineers and Contractors see assigned projects only
router.get("/", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const filter = {};

        if (req.user.role === "Site Engineer") {
            const projects = await Project.find({
                siteEngineers: req.user._id
            }).select("_id");

            filter.project = {
                $in: projects.map(project => project._id)
            };
        }

        if (req.user.role === "Contractor") {
            const projects = await Project.find({
                contractors: req.user._id
            }).select("_id");

            filter.project = {
                $in: projects.map(project => project._id)
            };
        }

        if (req.query.project) {
            if (!mongoose.Types.ObjectId.isValid(req.query.project)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid project ID"
                });
            }

            if (
                req.user.role === "Site Engineer" ||
                req.user.role === "Contractor"
            ) {
                const hasAccess = await hasProjectAccess(
                    req.query.project,
                    req.user
                );

                if (!hasAccess) {
                    return res.status(403).json({
                        success: false,
                        message: "You do not have access to this project's progress records."
                    });
                }
            }

            filter.project = req.query.project;
        }

        const records = await DailyProgress.find(filter)
            .populate("project", "projectName")
            .populate("task", "title status")
            .sort({ date: -1 });

        res.json({
            success: true,
            count: records.length,
            records
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET daily progress by ID
// All five roles, with assignment restrictions
router.get("/:id", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const record = await DailyProgress.findById(req.params.id)
            .populate("project", "projectName")
            .populate("task", "title status");

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Daily progress record not found"
            });
        }

        if (
            req.user.role === "Site Engineer" ||
            req.user.role === "Contractor"
        ) {
            if (!record.project) {
                return res.status(404).json({
                    success: false,
                    message: "Associated project not found"
                });
            }

            const hasAccess = await hasProjectAccess(
                record.project._id,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this progress record."
                });
            }
        }

        res.json({
            success: true,
            record
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid progress record ID"
        });
    }
});

// UPDATE daily progress
// Admin, Project Manager and assigned Site Engineer
router.put("/:id", authorizeRoles(...progressManagementRoles), async (req, res) => {
    try {
        const record = await DailyProgress.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Daily progress record not found"
            });
        }

        if (req.user.role === "Site Engineer") {
            const hasAccess = await hasProjectAccess(
                record.project,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You can only update progress records for your assigned projects."
                });
            }
        }

        const targetProject = req.body.project || record.project;

        if (!mongoose.Types.ObjectId.isValid(targetProject)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        const projectExists = await Project.findById(targetProject);

        if (!projectExists) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        if (req.user.role === "Site Engineer") {
            const hasTargetAccess = await hasProjectAccess(
                targetProject,
                req.user
            );

            if (!hasTargetAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You can only update progress within your assigned projects."
                });
            }
        }

        // Preserve the existing task unless a new task is supplied
        const targetTask = Object.prototype.hasOwnProperty.call(
            req.body,
            "task"
        )
            ? req.body.task
            : record.task;

        if (targetTask) {
            if (!mongoose.Types.ObjectId.isValid(targetTask)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid task ID"
                });
            }

            const taskExists = await Task.findOne({
                _id: targetTask,
                project: targetProject
            });

            if (!taskExists) {
                return res.status(404).json({
                    success: false,
                    message: "Task not found in this project"
                });
            }
        }

        const updateData = {
            ...req.body
        };

        // Do not allow changing the original recorder
        delete updateData.recordedBy;

        Object.assign(record, updateData);

        await record.save();

        const updatedRecord = await DailyProgress.findById(record._id)
            .populate("project", "projectName")
            .populate("task", "title status");

        res.json({
            success: true,
            message: "Daily progress updated successfully",
            record: updatedRecord
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE daily progress
// Only Admin and Project Manager
router.delete("/:id", authorizeRoles(...deleteRoles), async (req, res) => {
    try {
        const record = await DailyProgress.findByIdAndDelete(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Daily progress record not found"
            });
        }

        res.json({
            success: true,
            message: "Daily progress record deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid progress record ID"
        });
    }
});

module.exports = router;
