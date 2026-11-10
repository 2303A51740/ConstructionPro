const mongoose = require("mongoose");

const Project = require("../models/Project");
const Task = require("../models/Task");
const Resource = require("../models/Resource");
const Milestone = require("../models/Milestone");
const MaterialConsumption = require("../models/MaterialConsumption");

const getAccessibleProjectIds = async (user) => {
    if (
        user.role === "Admin" ||
        user.role === "Project Manager" ||
        user.role === "Store Manager"
    ) {
        return null;
    }

    if (user.role === "Site Engineer") {
        return await Project.find({
            siteEngineers: user._id
        }).distinct("_id");
    }

    if (user.role === "Contractor") {
        return await Project.find({
            contractors: user._id
        }).distinct("_id");
    }

    return [];
};

const isValidProjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const checkProjectAccess = async (projectId, user) => {
    const projectIds = await getAccessibleProjectIds(user);

    if (projectIds === null) {
        return true;
    }

    return projectIds.some(
        (id) => id.toString() === projectId.toString()
    );
};

// 1. Project Progress Report
const getProjectProgressReport = async (req, res) => {
    try {
        const projectIds = await getAccessibleProjectIds(req.user);

        const projectFilter = {};

        if (projectIds !== null) {
            projectFilter._id = { $in: projectIds };
        }

        const projects = await Project.find(projectFilter)
            .sort({ createdAt: -1 });

        const reports = await Promise.all(
            projects.map(async (project) => {
                const tasks = await Task.find({
                    project: project._id
                });

                const completedTasks = tasks.filter(
                    (task) => task.status === "Completed"
                ).length;

                return {
                    projectName: project.projectName,
                    location: project.location,
                    manager: project.projectManager,
                    progress: project.progress,
                    status: project.status,
                    budget: project.budget,
                    totalTasks: tasks.length,
                    completedTasks,
                    pendingTasks: tasks.length - completedTasks,
                    startDate: project.startDate,
                    endDate: project.endDate
                };
            })
        );

        res.status(200).json({
            success: true,
            totalProjects: reports.length,
            reports
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 2. Resource Utilization Report
const getResourceUtilizationReport = async (req, res) => {
    try {
        const projectIds = await getAccessibleProjectIds(req.user);

        const resourceFilter = {};

        if (projectIds !== null) {
            resourceFilter.assignedProject = {
                $in: projectIds
            };
        }

        const resources = await Resource.find(resourceFilter)
            .populate("assignedProject", "projectName");

        const totalResources = resources.length;

        const totalQuantity = resources.reduce(
            (total, resource) =>
                total + Number(resource.quantity || 0),
            0
        );

        const assignedResources = resources.filter(
            (resource) =>
                resource.status === "Assigned" ||
                resource.status === "In Use"
        );

        const typeMap = {};
        const statusMap = {};

        resources.forEach((resource) => {
            const type = resource.type || "Other";
            const status = resource.status || "Unknown";
            const quantity = Number(resource.quantity || 0);

            if (!typeMap[type]) {
                typeMap[type] = {
                    _id: type,
                    resourceCount: 0,
                    totalQuantity: 0
                };
            }

            typeMap[type].resourceCount += 1;
            typeMap[type].totalQuantity += quantity;

            if (!statusMap[status]) {
                statusMap[status] = {
                    _id: status,
                    resourceCount: 0,
                    totalQuantity: 0
                };
            }

            statusMap[status].resourceCount += 1;
            statusMap[status].totalQuantity += quantity;
        });

        res.status(200).json({
            success: true,
            totalResources,
            totalQuantity,
            assignedResourceCount: assignedResources.length,
            typeBreakdown: Object.values(typeMap),
            statusBreakdown: Object.values(statusMap),
            resources
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 3. Material Consumption Report
const getMaterialConsumptionReport = async (req, res) => {
    try {
        const projectIds = await getAccessibleProjectIds(req.user);

        const match = {};

        if (projectIds !== null) {
            match.project = { $in: projectIds };
        }

        if (req.query.project) {
            if (!isValidProjectId(req.query.project)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid project ID"
                });
            }

            const requestedProject = await Project.findById(
                req.query.project
            );

            if (!requestedProject) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found"
                });
            }

            const hasAccess = await checkProjectAccess(
                requestedProject._id,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this project"
                });
            }

            match.project = requestedProject._id;
        }

        const report = await MaterialConsumption.aggregate([
            {
                $match: match
            },
            {
                $group: {
                    _id: {
                        project: "$project",
                        materialName: "$materialName",
                        unit: "$unit"
                    },
                    totalConsumed: {
                        $sum: "$quantityConsumed"
                    },
                    recordCount: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    "_id.materialName": 1
                }
            },
            {
                $lookup: {
                    from: "projects",
                    localField: "_id.project",
                    foreignField: "_id",
                    as: "project"
                }
            },
            {
                $unwind: "$project"
            },
            {
                $project: {
                    _id: 0,
                    projectName: "$project.projectName",
                    materialName: "$_id.materialName",
                    unit: "$_id.unit",
                    totalConsumed: 1,
                    recordCount: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            totalMaterialRecords: report.reduce(
                (total, item) => total + item.recordCount,
                0
            ),
            report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 4. Milestone Status Report
const getMilestoneStatusReport = async (req, res) => {
    try {
        const projectIds = await getAccessibleProjectIds(req.user);

        const milestoneFilter = {};

        if (projectIds !== null) {
            milestoneFilter.project = {
                $in: projectIds
            };
        }

        const milestones = await Milestone.find(milestoneFilter)
            .populate("project", "projectName")
            .sort({ dueDate: 1 });

        const currentDate = new Date();

        const statusBreakdown = await Milestone.aggregate([
            {
                $match: milestoneFilter
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const overdueMilestones = milestones.filter(
            (milestone) =>
                milestone.status !== "Completed" &&
                new Date(milestone.dueDate) < currentDate
        );

        res.status(200).json({
            success: true,
            totalMilestones: milestones.length,
            overdueCount: overdueMilestones.length,
            statusBreakdown,
            overdueMilestones,
            milestones
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Record material consumption
const createMaterialConsumption = async (req, res) => {
    let deductedResourceId = null;
    let deductedQuantity = 0;

    try {
        const {
            project,
            resource,
            materialName,
            quantityConsumed,
            unit,
            date,
            notes
        } = req.body;

        if (
            !project ||
            !materialName ||
            quantityConsumed === undefined ||
            !unit ||
            !date
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required material consumption details"
            });
        }

        if (!isValidProjectId(project)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        if (
            typeof quantityConsumed !== "number" ||
            !Number.isFinite(quantityConsumed) ||
            quantityConsumed <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Consumed quantity must be a positive number"
            });
        }

        const projectExists = await Project.findById(project);

        if (!projectExists) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        if (resource) {
            if (!isValidProjectId(resource)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid resource ID"
                });
            }

            const resourceExists = await Resource.findById(resource);

            if (!resourceExists || resourceExists.type !== "Material") {
                return res.status(404).json({
                    success: false,
                    message: "Material resource not found"
                });
            }

            if (
                resourceExists.assignedProject &&
                resourceExists.assignedProject.toString() !== project
            ) {
                return res.status(400).json({
                    success: false,
                    message: "This material is assigned to another project"
                });
            }

            const updatedResource = await Resource.findOneAndUpdate(
                {
                    _id: resource,
                    type: "Material",
                    quantity: {
                        $gte: quantityConsumed
                    },
                    $or: [
                        { assignedProject: project },
                        { assignedProject: null }
                    ]
                },
                {
                    $inc: {
                        quantity: -quantityConsumed
                    }
                },
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!updatedResource) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient material stock or resource assignment changed"
                });
            }

            deductedResourceId = updatedResource._id;
            deductedQuantity = quantityConsumed;
        }

        const consumption = await MaterialConsumption.create({
            project,
            resource: resource || null,
            materialName,
            quantityConsumed,
            unit,
            date,
            recordedBy: req.user.fullName,
            notes
        });

        res.status(201).json({
            success: true,
            message: "Material consumption recorded successfully and stock updated",
            consumption
        });
    } catch (error) {
        if (deductedResourceId && deductedQuantity > 0) {
            await Resource.updateOne(
                { _id: deductedResourceId },
                {
                    $inc: {
                        quantity: deductedQuantity
                    }
                }
            );
        }

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get material consumption records
const getMaterialConsumptions = async (req, res) => {
    try {
        const projectIds = await getAccessibleProjectIds(req.user);

        const filter = {};

        if (projectIds !== null) {
            filter.project = {
                $in: projectIds
            };
        }

        if (req.query.project) {
            if (!isValidProjectId(req.query.project)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid project ID"
                });
            }

            const projectExists = await Project.findById(
                req.query.project
            );

            if (!projectExists) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found"
                });
            }

            const hasAccess = await checkProjectAccess(
                projectExists._id,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this project"
                });
            }

            filter.project = projectExists._id;
        }

        const records = await MaterialConsumption.find(filter)
            .populate("project", "projectName")
            .populate("resource", "name type unit")
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            totalRecords: records.length,
            records
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getProjectProgressReport,
    getResourceUtilizationReport,
    getMaterialConsumptionReport,
    getMilestoneStatusReport,
    createMaterialConsumption,
    getMaterialConsumptions
};