
const express = require("express");
const router = express.Router();

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

// Validate assigned users
const validateAssignedUsers = async (userIds, role) => {
    if (!Array.isArray(userIds)) {
        return {
            valid: false,
            message: `${role} assignments must be an array`
        };
    }

    const uniqueIds = [...new Set(userIds.map(id => String(id)))];

    const users = await User.find({
        _id: { $in: uniqueIds },
        role,
        isActive: true
    }).select("_id");

    if (users.length !== uniqueIds.length) {
        return {
            valid: false,
            message: `One or more assigned ${role} accounts are invalid or inactive`
        };
    }

    return {
        valid: true
    };
};

// Get project visibility filter based on user role
const getProjectFilter = (user) => {
    if (user.role === "Site Engineer") {
        return {
            siteEngineers: user._id
        };
    }

    if (user.role === "Contractor") {
        return {
            contractors: user._id
        };
    }

    return {};
};

// CREATE project
// Only Admin and Project Manager
router.post("/", authorizeRoles(...managementRoles), async (req, res) => {
    try {
        if (req.body.siteEngineers !== undefined) {
            const validation = await validateAssignedUsers(
                req.body.siteEngineers,
                "Site Engineer"
            );

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.message
                });
            }
        }

        if (req.body.contractors !== undefined) {
            const validation = await validateAssignedUsers(
                req.body.contractors,
                "Contractor"
            );

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.message
                });
            }
        }

        const project = await Project.create(req.body);

        res.status(201).json({
            success: true,
            message: "Project created successfully",
            project
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// GET all projects
// Site Engineers and Contractors see assigned projects only
router.get("/", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const filter = getProjectFilter(req.user);

        const projects = await Project.find(filter)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: projects.length,
            projects
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET project by ID
// Site Engineers and Contractors can access assigned projects only
router.get("/:id", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const filter = {
            _id: req.params.id,
            ...getProjectFilter(req.user)
        };

        const project = await Project.findOne(filter);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or you do not have access"
            });
        }

        res.json({
            success: true,
            project
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid project ID"
        });
    }
});

// UPDATE project
// Only Admin and Project Manager
router.put("/:id", authorizeRoles(...managementRoles), async (req, res) => {
    try {
        if (req.body.siteEngineers !== undefined) {
            const validation = await validateAssignedUsers(
                req.body.siteEngineers,
                "Site Engineer"
            );

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.message
                });
            }
        }

        if (req.body.contractors !== undefined) {
            const validation = await validateAssignedUsers(
                req.body.contractors,
                "Contractor"
            );

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.message
                });
            }
        }

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        res.json({
            success: true,
            message: "Project updated successfully",
            project
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE project
// Only Admin and Project Manager
router.delete("/:id", authorizeRoles(...managementRoles), async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        res.json({
            success: true,
            message: "Project deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid project ID"
        });
    }
});

module.exports = router;
