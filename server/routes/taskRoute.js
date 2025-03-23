import express from "express";
import {
  createSubTask,
  createTask,
  dashboardStatistics,
  deleteRestoreTask,
  duplicateTask,
  getTask,
  getTasks,
  postTaskActivity,
  trashTask,
  updateTask,
  updateTaskStage,
  getAllTasks,
  getDashboardStats
} from "../controllers/taskController.js";
import { isAdminRoute, protectRoute, isManagerRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

// Routes that both admins and managers can access
router.post("/create", protectRoute, isManagerRoute, createTask);
router.post("/duplicate/:id", protectRoute, isManagerRoute, duplicateTask);
router.post("/activity/:id", protectRoute, postTaskActivity);

router.get("/dashboard", protectRoute, dashboardStatistics);
router.get("/all-tasks", protectRoute, isManagerRoute, getAllTasks);
router.get("/dashboard-stats", protectRoute, isManagerRoute, getDashboardStats);
router.get("/", protectRoute, getTasks);
router.get("/:id", protectRoute, getTask);

router.put("/create-subtask/:id", protectRoute, isManagerRoute, createSubTask);
router.put("/update/:id", protectRoute, isManagerRoute, updateTask);
router.put("/change-stage/:id", protectRoute, updateTaskStage);
router.put("/:id", protectRoute, isManagerRoute, trashTask);

router.delete(
  "/delete-restore/:id?",
  protectRoute,
  isManagerRoute,
  deleteRestoreTask
);

export default router;