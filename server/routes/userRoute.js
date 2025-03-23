import express from "express";
import {
  activateUserProfile,
  changeUserPassword,
  deleteUserProfile,
  getNotificationsList,
  getTeamList,
  loginUser,
  logoutUser,
  markNotificationRead,
  registerUser,
  updateUserProfile,
  getManagersList,
  getTeamsList,
  assignManager,
  getTeamMembers,
  getManagerHierarchy,
  getTeamMembersForTaskAssignment,
  isManagerMiddleware,
  verifyToken,  // Added the import for verifyToken
} from "../controllers/userController.js";
import { isAdminRoute, isManagerRoute, protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

// Protected routes
router.get("/verify", protectRoute, verifyToken);  // New route for token verification
router.get("/notifications", protectRoute, getNotificationsList);
router.get("/teams", protectRoute, getTeamsList);
router.get("/manager-hierarchy/:managerId", protectRoute, getManagerHierarchy);

router.put("/profile", protectRoute, updateUserProfile);
router.put("/read-noti", protectRoute, markNotificationRead);
router.put("/change-password", protectRoute, changeUserPassword);

// Admin only routes
router.get("/get-team", protectRoute, isAdminRoute, getTeamList);
router.get("/managers", protectRoute, getManagersList);

router
  .route("/:id")
  .put(protectRoute, isAdminRoute, activateUserProfile)
  .delete(protectRoute, isAdminRoute, deleteUserProfile);

// Manager specific routes
router.get("/team-members-for-tasks", protectRoute, isManagerMiddleware, getTeamMembersForTaskAssignment);
router.get("/team-members/:managerId", protectRoute, getTeamMembers);
router.put("/assign-manager", protectRoute, assignManager);

export default router;