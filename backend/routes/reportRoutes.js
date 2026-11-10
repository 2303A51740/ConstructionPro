const express = require("express");

const router = express.Router();

const { authorizeRoles } = require("../middleware/authorizeRoles");

const {
    getProjectProgressReport,
    getResourceUtilizationReport,
    getMaterialConsumptionReport,
    getMilestoneStatusReport,
    createMaterialConsumption,
    getMaterialConsumptions
} = require("../controllers/reportController");

// Project Progress Report
router.get(
    "/project-progress",
    authorizeRoles(
        "Admin",
        "Project Manager",
        "Site Engineer",
        "Contractor"
    ),
    getProjectProgressReport
);

// Resource Utilization Report
router.get(
    "/resource-utilization",
    authorizeRoles(
        "Admin",
        "Project Manager",
        "Store Manager",
        "Contractor"
    ),
    getResourceUtilizationReport
);

// Material Consumption Report
router.get(
    "/material-consumption",
    authorizeRoles(
        "Admin",
        "Project Manager",
        "Site Engineer",
        "Store Manager",
        "Contractor"
    ),
    getMaterialConsumptionReport
);

// Milestone Status Report
router.get(
    "/milestone-status",
    authorizeRoles(
        "Admin",
        "Project Manager",
        "Site Engineer",
        "Contractor"
    ),
    getMilestoneStatusReport
);

// Record Material Consumption
// Contractors cannot create consumption records.
router.post(
    "/material-consumption",
    authorizeRoles(
        "Admin",
        "Project Manager",
        "Store Manager"
    ),
    createMaterialConsumption
);

// View Material Consumption Records
router.get(
    "/material-consumption-records",
    authorizeRoles(
        "Admin",
        "Project Manager",
        "Site Engineer",
        "Store Manager",
        "Contractor"
    ),
    getMaterialConsumptions
);

module.exports = router;