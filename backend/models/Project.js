
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {
        projectName: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            type: String,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        startDate: {
            type: Date,
            required: true
        },

        endDate: {
            type: Date,
            required: true
        },

        budget: {
            type: Number,
            required: true,
            min: 0
        },

        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        status: {
            type: String,
            enum: ["Planning", "Ongoing", "Completed", "On Hold"],
            default: "Planning"
        },

        projectManager: {
            type: String,
            required: true
        },

        siteEngineers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        contractors: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Project", projectSchema);
