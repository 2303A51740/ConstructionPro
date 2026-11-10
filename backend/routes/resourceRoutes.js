
const express = require("express");
const router = express.Router();

const Resource = require("../models/Resource");
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

const resourceManagementRoles = [
    "Admin",
    "Project Manager",
    "Store Manager"
];

// Validate assigned project
const validateAssignedProject = async (projectId) => {
    if (!projectId) {
        return true;
    }

    const projectExists = await Project.findById(projectId);

    return Boolean(projectExists);
};

// CREATE resource
// Admin, Project Manager and Store Manager
router.post("/", authorizeRoles(...resourceManagementRoles), async (req, res) => {
    try {
        if (req.body.assignedProject) {
            const projectExists = await validateAssignedProject(
                req.body.assignedProject
            );

            if (!projectExists) {
                return res.status(404).json({
                    success: false,
                    message: "Assigned project not found"
                });
            }
        }

        const resource = await Resource.create(req.body);

        res.status(201).json({
            success: true,
            message: "Resource created successfully",
            resource
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// GET all resources (optional filters: type, status)
// All five roles
router.get("/", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const filter = {};

        if (req.query.type) {
            filter.type = req.query.type;
        }

        if (req.query.status) {
            filter.status = req.query.status;
        }

        const resources = await Resource.find(filter)
            .populate("assignedProject", "projectName")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: resources.length,
            resources
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET resource by ID
// All five roles
router.get("/:id", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id)
            .populate("assignedProject", "projectName");

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        res.json({
            success: true,
            resource
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid resource ID"
        });
    }
});

// UPDATE resource
// Admin, Project Manager and Store Manager
router.put("/:id", authorizeRoles(...resourceManagementRoles), async (req, res) => {
    try {
        const existingResource = await Resource.findById(req.params.id);

        if (!existingResource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        if (req.body.assignedProject) {
            const projectExists = await validateAssignedProject(
                req.body.assignedProject
            );

            if (!projectExists) {
                return res.status(404).json({
                    success: false,
                    message: "Assigned project not found"
                });
            }
        }

        const resource = await Resource.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        res.json({
            success: true,
            message: "Resource updated successfully",
            resource
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE resource
// Admin, Project Manager and Store Manager
router.delete("/:id", authorizeRoles(...resourceManagementRoles), async (req, res) => {
    try {
        const resource = await Resource.findByIdAndDelete(req.params.id);

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        res.json({
            success: true,
            message: "Resource deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid resource ID"
        });
    }
});

module.exports = router;
