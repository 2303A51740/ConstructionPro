
const express = require("express");
const router = express.Router();

const Expense = require("../models/Expense");
const Project = require("../models/Project");

const { authorizeRoles } = require("../middleware/authorizeRoles");

const allRoles = [
    "Admin",
    "Project Manager",
    "Site Engineer",
    "Store Manager"
];

const managementRoles = [
    "Admin",
    "Project Manager",
    "Store Manager"
];

const approvalRoles = [
    "Admin",
    "Project Manager"
];

const deleteRoles = [
    "Admin",
    "Project Manager"
];

const hasProjectAccess = async (projectId, user) => {
    if (user.role === "Admin") {
        return true;
    }

    if (user.role === "Site Engineer") {
        return Boolean(await Project.exists({
            _id: projectId,
            siteEngineers: user._id
        }));
    }

    if (user.role === "Project Manager") {
        return Boolean(await Project.exists({
            _id: projectId,
            projectManager: user.fullName
        }));
    }

    return true;
};

// CREATE EXPENSE
router.post("/", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const {
            project,
            title,
            category,
            amount,
            date,
            description
        } = req.body;

        if (!project || !title || !category || amount === undefined || !date) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required expense details."
            });
        }

        const projectExists = await Project.findById(project);

        if (!projectExists) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        if (["Site Engineer", "Project Manager"].includes(req.user.role)) {
            const hasAccess = await hasProjectAccess(project, req.user);

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this project."
                });
            }
        }

        const expense = await Expense.create({
            project,
            title,
            category,
            amount: Number(amount),
            date,
            description: description || "",
            recordedBy: req.user.fullName,
            submittedBy: req.user._id,
            status: req.user.role === "Site Engineer"
                ? "Pending"
                : "Approved"
        });

        res.status(201).json({
            success: true,
            message: req.user.role === "Site Engineer"
                ? "Expense submitted for approval successfully."
                : "Expense recorded successfully.",
            expense
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// GET ALL EXPENSES
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

            filter.submittedBy = req.user._id;
        }

        if (req.user.role === "Project Manager") {
            const projects = await Project.find({
                projectManager: req.user.fullName
            }).select("_id");

            filter.project = {
                $in: projects.map(project => project._id)
            };
        }

        if (req.query.project) {
            const hasAccess = await hasProjectAccess(
                req.query.project,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this project's expenses."
                });
            }

            filter.project = req.query.project;
        }

        if (req.query.category) {
            filter.category = req.query.category;
        }

        if (req.query.status) {
            filter.status = req.query.status;
        }

        const expenses = await Expense.find(filter)
            .populate("project", "projectName budget")
            .populate("submittedBy", "fullName email")
            .populate("reviewedBy", "fullName email")
            .sort({ date: -1 });

        res.json({
            success: true,
            count: expenses.length,
            expenses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET EXPENSE BY ID
router.get("/:id", authorizeRoles(...allRoles), async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id)
            .populate("project", "projectName budget")
            .populate("submittedBy", "fullName email")
            .populate("reviewedBy", "fullName email");

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        if (req.user.role === "Site Engineer") {
            if (
                !expense.submittedBy ||
                expense.submittedBy._id.toString() !== req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You can only view your submitted expenses."
                });
            }
        }

        const hasAccess = await hasProjectAccess(
            expense.project._id,
            req.user
        );

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: "You do not have access to this expense."
            });
        }

        res.json({
            success: true,
            expense
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid expense ID."
        });
    }
});

// APPROVE OR REJECT EXPENSE
router.patch(
    "/:id/review",
    authorizeRoles(...approvalRoles),
    async (req, res) => {
        try {
            const { status, rejectionReason } = req.body;

            if (!["Approved", "Rejected"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Status must be Approved or Rejected."
                });
            }

            if (status === "Rejected" && !rejectionReason?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a rejection reason."
                });
            }

            const expense = await Expense.findById(req.params.id);

            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: "Expense not found."
                });
            }

            if (expense.status !== "Pending") {
                return res.status(400).json({
                    success: false,
                    message: "Only pending expenses can be reviewed."
                });
            }

            const hasAccess = await hasProjectAccess(
                expense.project,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot review expenses for this project."
                });
            }

            expense.status = status;
            expense.reviewedBy = req.user._id;
            expense.reviewedAt = new Date();
            expense.rejectionReason =
                status === "Rejected" ? rejectionReason.trim() : "";

            await expense.save();

            res.json({
                success: true,
                message: `Expense ${status.toLowerCase()} successfully.`,
                expense
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// UPDATE EXPENSE
router.put(
    "/:id",
    authorizeRoles(...managementRoles),
    async (req, res) => {
        try {
            const expense = await Expense.findById(req.params.id);

            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: "Expense not found."
                });
            }

            const hasAccess = await hasProjectAccess(
                expense.project,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot update expenses for this project."
                });
            }

            const allowedFields = [
                "project",
                "title",
                "category",
                "amount",
                "date",
                "description"
            ];

            const updateData = {};

            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            });

            if (updateData.project) {
                const projectExists = await Project.findById(
                    updateData.project
                );

                if (!projectExists) {
                    return res.status(404).json({
                        success: false,
                        message: "Project not found."
                    });
                }

                const newProjectAccess = await hasProjectAccess(
                    updateData.project,
                    req.user
                );

                if (!newProjectAccess) {
                    return res.status(403).json({
                        success: false,
                        message: "You cannot move expenses to this project."
                    });
                }
            }

            const updatedExpense = await Expense.findByIdAndUpdate(
                req.params.id,
                updateData,
                {
                    new: true,
                    runValidators: true
                }
            );

            res.json({
                success: true,
                message: "Expense updated successfully.",
                expense: updatedExpense
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
);

// DELETE EXPENSE
router.delete(
    "/:id",
    authorizeRoles(...deleteRoles),
    async (req, res) => {
        try {
            const expense = await Expense.findById(req.params.id);

            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: "Expense not found."
                });
            }

            const hasAccess = await hasProjectAccess(
                expense.project,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot delete expenses for this project."
                });
            }

            await Expense.findByIdAndDelete(req.params.id);

            res.json({
                success: true,
                message: "Expense deleted successfully."
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: "Unable to delete expense."
            });
        }
    }
);

// PROJECT EXPENSE SUMMARY
router.get(
    "/summary/:projectId",
    authorizeRoles(...allRoles),
    async (req, res) => {
        try {
            const project = await Project.findById(req.params.projectId);

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found."
                });
            }

            const hasAccess = await hasProjectAccess(
                project._id,
                req.user
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this project's summary."
                });
            }

            const result = await Expense.aggregate([
                {
                    $match: {
                        project: project._id,
                        $or: [
                            { status: "Approved" },
                            { status: { $exists: false } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: "$category",
                        totalAmount: { $sum: "$amount" }
                    }
                }
            ]);

            const totalSpent = result.reduce(
                (total, item) => total + item.totalAmount,
                0
            );

            res.json({
                success: true,
                projectName: project.projectName,
                totalBudget: project.budget,
                totalSpent,
                remainingBudget: project.budget - totalSpent,
                categoryBreakdown: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

module.exports = router;
