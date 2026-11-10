
const mongoose = require("mongoose");

const dailyProgressSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null
        },

        date: {
            type: Date,
            required: true
        },

        workDescription: {
            type: String,
            required: true
        },

        completedWork: {
            type: String,
            required: true
        },

        progressPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },

        workersPresent: {
            type: Number,
            default: 0,
            min: 0
        },

        materialsUsed: {
            type: String,
            default: ""
        },

        equipmentUsed: {
            type: String,
            default: ""
        },

        issues: {
            type: String,
            default: ""
        },

        recordedBy: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("DailyProgress", dailyProgressSchema);
