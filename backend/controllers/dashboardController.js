
const Project = require("../models/Project");
const Task = require("../models/Task");
const Resource = require("../models/Resource");
const Expense = require("../models/Expense");
const Milestone = require("../models/Milestone");

const getDashboardStats = async (req, res) => {
    try {
        const [
            totalProjects,
            ongoingProjects,
            completedProjects,
            totalTasks,
            completedTasks,
            totalResources,
            totalMilestones,
            completedMilestones,
            expenseSummary
        ] = await Promise.all([
            Project.countDocuments(),
            Project.countDocuments({ status: "Ongoing" }),
            Project.countDocuments({ status: "Completed" }),
            Task.countDocuments(),
            Task.countDocuments({ status: "Completed" }),
            Resource.countDocuments(),
            Milestone.countDocuments(),
            Milestone.countDocuments({ status: "Completed" }),
            Expense.aggregate([
                {
                    $group: {
                        _id: null,
                        totalExpenses: { $sum: "$amount" }
                    }
                }
            ])
        ]);

        const projectSummary = await Project.aggregate([
            {
                $group: {
                    _id: null,
                    totalBudget: { $sum: "$budget" }
                }
            }
        ]);

        const totalBudget = projectSummary[0]?.totalBudget || 0;
        const totalExpenses = expenseSummary[0]?.totalExpenses || 0;

        const recentProjects = await Project.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select("projectName location progress status budget");

        const recentTasks = await Task.find()
            .populate("project", "projectName")
            .sort({ createdAt: -1 })
            .limit(5)
            .select("title status priority progress dueDate project");

        res.status(200).json({
            success: true,
            statistics: {
                totalProjects,
                ongoingProjects,
                completedProjects,
                totalTasks,
                completedTasks,
                pendingTasks: totalTasks - completedTasks,
                totalResources,
                totalMilestones,
                completedMilestones,
                pendingMilestones: totalMilestones - completedMilestones,
                totalBudget,
                totalExpenses,
                remainingBudget: totalBudget - totalExpenses
            },
            recentProjects,
            recentTasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getDashboardStats
};
