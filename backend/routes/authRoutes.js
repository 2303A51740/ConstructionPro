
const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    getMe,
    getAllUsers,
    updateUserRole,
    updateUserStatus,
    deleteUser
} = require("../controllers/authController");

const {
    protect,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.post("/login", loginUser);

router.get("/me", protect, getMe);

router.post(
    "/register",
    protect,
    authorizeRoles("Admin"),
    registerUser
);

router.get(
    "/users",
    protect,
    authorizeRoles("Admin"),
    getAllUsers
);

router.patch(
    "/users/:id/role",
    protect,
    authorizeRoles("Admin"),
    updateUserRole
);

router.patch(
    "/users/:id/status",
    protect,
    authorizeRoles("Admin"),
    updateUserStatus
);

router.delete(
    "/users/:id",
    protect,
    authorizeRoles("Admin"),
    deleteUser
);

module.exports = router;
