
const express = require("express");

const router = express.Router();

const {
    getDashboardStats
} = require("../controllers/dashboardController");

const { authorizeRoles } = require("../middleware/authorizeRoles");

// All five roles can access the dashboard
const dashboardRoles = [
    "Admin",
    "Project Manager",
    "Site Engineer",
    "Contractor",
    "Store Manager"
];

// Dashboard statistics
router.get(
    "/",
    authorizeRoles(...dashboardRoles),
    getDashboardStats
);

module.exports = router;
