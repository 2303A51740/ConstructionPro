
const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        dueDate: {
            type: Date,
            required: true
        },

        completedDate: {
            type: Date,
            default: null
        },

        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed", "Delayed"],
            default: "Pending"
        },

        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Milestone", milestoneSchema);
