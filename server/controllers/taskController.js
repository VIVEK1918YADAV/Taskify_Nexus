import asyncHandler from "express-async-handler";
import Notice from "../models/notis.js";
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";

const createTask = asyncHandler(async (req, res) => {
  const { title, date, priority, stage, assets, team } = req.body;
  
  try {
    // If user is a manager, verify they are only assigning to their team
    if (req.user.role === 'manager') {
      // Get the team members that the manager is trying to assign
      const teamMembers = await User.find({ _id: { $in: team } }).select('team');
      
      // Check if any team member isn't in the manager's team
      const unauthorizedAssignment = teamMembers.some(member => member.team !== req.user.team);
      
      if (unauthorizedAssignment) {
        return res.status(403).json({
          status: false,
          message: "You can only assign tasks to members of your own team"
        });
      }
    }

    // Create new task
    const task = new Task({
      title,
      date,
      priority: priority?.toLowerCase(),
      stage: stage?.toLowerCase(),
      assets,
      team,
      // Set the manager who created the task
      managerId: req.user.userId,
      // Set the team department
      teamDepartment: req.user.team
    });
    
    await task.save();
    
    res.status(201).json({
      status: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    res.status(400).json({
      status: false,
      message: error.message,
    });
  }
});

// Get all tasks with filtering by manager
const getAllTasks = asyncHandler(async (req, res) => {
  const { stage, isTrashed, search, managerId } = req.query;
  
  let query = { isTrashed: isTrashed === "true" };
  
  // Filter by stage
  if (stage !== "all") {
    query.stage = stage;
  }
  
  // Filter by search term
  if (search) {
    query.title = { $regex: search, $options: "i" };
  }
  
  // If user is a manager, restrict to only their team's tasks
  if (req.user.role === "manager") {
    query.managerId = req.user.userId;
  } 
  // If a specific manager ID is requested and user is admin
  else if (managerId && req.user.isAdmin) {
    query.managerId = managerId;
  }
  
  const tasks = await Task.find(query)
    .sort({ createdAt: -1 })
    .populate("team", "name");
  
  res.status(200).json(tasks);
});

// Dashboard statistics with team filtering
const getDashboardStats = asyncHandler(async (req, res) => {
  const { managerId } = req.query;
  
  // Base query to exclude trashed items
  let query = { isTrashed: false };
  
  // Filter by manager if manager or if admin requests specific manager
  if (req.user.role === "manager") {
    query.managerId = req.user.userId;
  } else if (managerId && req.user.isAdmin) {
    query.managerId = managerId;
  }
  
  // Get counts for each stage
  const todoCount = await Task.countDocuments({ ...query, stage: "todo" });
  const inProgressCount = await Task.countDocuments({ ...query, stage: "in progress" });
  const completedCount = await Task.countDocuments({ ...query, stage: "completed" });
  
  // Priority distributions
  const highPriority = await Task.countDocuments({ ...query, priority: "high" });
  const mediumPriority = await Task.countDocuments({ ...query, priority: "medium" });
  const normalPriority = await Task.countDocuments({ ...query, priority: "normal" });
  const lowPriority = await Task.countDocuments({ ...query, priority: "low" });
  
  res.status(200).json({
    stages: {
      todo: todoCount,
      inProgress: inProgressCount,
      completed: completedCount,
    },
    priorities: {
      high: highPriority,
      medium: mediumPriority,
      normal: normalPriority,
      low: lowPriority,
    },
  });
});

const duplicateTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const task = await Task.findById(id);
    
    // Check if manager is trying to duplicate a task from another team
    if (req.user.role === 'manager' && task.teamDepartment !== req.user.team) {
      return res.status(403).json({
        status: false,
        message: "You can only duplicate tasks from your own team"
      });
    }

    //alert users of the task
    let text = "New task has been assigned to you";
    if (task.team?.length > 1) {
      text = text + ` and ${task.team?.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set a ${
        task.priority
      } priority, so check and act accordingly. The task date is ${new Date(
        task.date
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "assigned",
      activity: text,
      by: userId,
    };

    const newTask = await Task.create({
      ...task.toObject(),
      title: "Duplicate - " + task.title,
      managerId: userId,
      teamDepartment: req.user.team
    });

    newTask.activities = [activity];
    await newTask.save();

    await Notice.create({
      team: newTask.team,
      text,
      task: newTask._id,
    });

    res
      .status(200)
      .json({ status: true, message: "Task duplicated successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, date, team, stage, priority, assets } = req.body;

  try {
    const task = await Task.findById(id);
    
    // Check if manager is trying to update a task from another team
    if (req.user.role === 'manager' && task.teamDepartment !== req.user.team) {
      return res.status(403).json({
        status: false,
        message: "You can only update tasks from your own team"
      });
    }
    
    // If user is a manager, verify they are only assigning to their team
    if (req.user.role === 'manager' && team) {
      // Get the team members that the manager is trying to assign
      const teamMembers = await User.find({ _id: { $in: team } }).select('team');
      
      // Check if any team member isn't in the manager's team
      const unauthorizedAssignment = teamMembers.some(member => member.team !== req.user.team);
      
      if (unauthorizedAssignment) {
        return res.status(403).json({
          status: false,
          message: "You can only assign tasks to members of your own team"
        });
      }
    }

    task.title = title;
    task.date = date;
    task.priority = priority.toLowerCase();
    task.assets = assets;
    task.stage = stage.toLowerCase();
    if (team) {
      task.team = team;
    }

    await task.save();

    res
      .status(200)
      .json({ status: true, message: "Task updated successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const updateTaskStage = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    const task = await Task.findById(id);
    
    // If user is a manager, check if they can update this task
    if (req.user.role === 'manager' && task.teamDepartment !== req.user.team) {
      return res.status(403).json({
        status: false,
        message: "You can only update tasks from your own team"
      });
    }

    task.stage = stage.toLowerCase();

    await task.save();

    res
      .status(200)
      .json({ status: true, message: "Task stage changed successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const createSubTask = asyncHandler(async (req, res) => {
  const { title, tag, date } = req.body;
  const { id } = req.params;

  try {
    const task = await Task.findById(id);
    
    // Check if manager is trying to modify a task from another team
    if (req.user.role === 'manager' && task.teamDepartment !== req.user.team) {
      return res.status(403).json({
        status: false,
        message: "You can only modify tasks from your own team"
      });
    }

    const newSubTask = {
      title,
      date,
      tag,
    };

    task.subTasks.push(newSubTask);

    await task.save();

    res
      .status(200)
      .json({ status: true, message: "SubTask added successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const getTasks = asyncHandler(async (req, res) => {
  const { userId, isAdmin, isManager, role, team } = req.user;
  const { stage, isTrashed, search } = req.query;

  let query = { isTrashed: isTrashed ? true : false };

  // If manager, only see tasks they created
  if (role === 'manager') {
    query.managerId = userId;
  } 
  // If regular team member, see tasks assigned to them
  else if (!isAdmin) {
    query.team = { $all: [userId] };
  }
  
  if (stage) {
    query.stage = stage;
  }

  if (search) {
    const searchQuery = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { stage: { $regex: search, $options: "i" } },
        { priority: { $regex: search, $options: "i" } },
      ],
    };
    query = { ...query, ...searchQuery };
  }

  let queryResult = Task.find(query)
    .populate({
      path: "team",
      select: "name title email team",
    })
    .sort({ _id: -1 });

  const tasks = await queryResult;

  res.status(200).json({
    status: true,
    tasks,
  });
});

const getTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { role, team, userId } = req.user;

    const task = await Task.findById(id)
      .populate({
        path: "team",
        select: "name title role email team",
      })
      .populate({
        path: "activities.by",
        select: "name",
      })
      .sort({ _id: -1 });
    
    // Check if manager is trying to access a task from another team
    if (role === 'manager' && task.teamDepartment !== team) {
      return res.status(403).json({
        status: false,
        message: "You can only access tasks from your own team"
      });
    }
    
    // For team members, they should only see tasks assigned to them
    if (role === 'team_member' || role === 'team_lead') {
      const isAssignedToUser = task.team.some(member => member._id.toString() === userId);
      if (!isAssignedToUser) {
        return res.status(403).json({
          status: false,
          message: "You don't have permission to view this task"
        });
      }
    }

    res.status(200).json({
      status: true,
      task,
    });
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch task", error);
  }
});

const postTaskActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role, team } = req.user;
  const { type, activity } = req.body;

  try {
    console.log(type,activity);
    const task = await Task.findById(id);
    console.log(task);
    // Check if manager is trying to modify a task from another team
    if (role === 'manager' && task.teamDepartment !== team) {
      return res.status(403).json({
        status: false,
        message: "You can only modify tasks from your own team"
      });
    }
// in the task table in mongo find the task by id and update the stage of that task to type received 
    const data = {
      type,
      activity,
      by: userId,
    };
    task.activities.push(data);
    task.stage = type; 
    await task.save();
    
    res
      .status(200)
      .json({ status: true, message: "Activity posted successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const trashTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, team } = req.user;

  try {
    const task = await Task.findById(id);
    
    // Check if manager is trying to trash a task from another team
    if (role === 'manager' && task.teamDepartment !== team) {
      return res.status(403).json({
        status: false,
        message: "You can only trash tasks from your own team"
      });
    }

    task.isTrashed = true;

    await task.save();

    res.status(200).json({
      status: true,
      message: `Task trashed successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const deleteRestoreTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType } = req.query;
    const { role, team } = req.user;

    if (actionType === "delete") {
      // Check if manager is trying to delete a task from another team
      if (role === 'manager') {
        const task = await Task.findById(id);
        if (task && task.teamDepartment !== team) {
          return res.status(403).json({
            status: false,
            message: "You can only delete tasks from your own team"
          });
        }
      }
      await Task.findByIdAndDelete(id);
    } else if (actionType === "deleteAll") {
      // For managers, only delete trashed tasks from their team
      if (role === 'manager') {
        await Task.deleteMany({ isTrashed: true, teamDepartment: team });
      } else {
        await Task.deleteMany({ isTrashed: true });
      }
    } else if (actionType === "restore") {
      const task = await Task.findById(id);
      
      // Check if manager is trying to restore a task from another team
      if (role === 'manager' && task.teamDepartment !== team) {
        return res.status(403).json({
          status: false,
          message: "You can only restore tasks from your own team"
        });
      }
      
      task.isTrashed = false;
      await task.save();
    } else if (actionType === "restoreAll") {
      // For managers, only restore trashed tasks from their team
      if (role === 'manager') {
        await Task.updateMany(
          { isTrashed: true, teamDepartment: team },
          { $set: { isTrashed: false } }
        );
      } else {
        await Task.updateMany(
          { isTrashed: true },
          { $set: { isTrashed: false } }
        );
      }
    }

    res.status(200).json({
      status: true,
      message: `Operation performed successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const dashboardStatistics = asyncHandler(async (req, res) => {
  try {
    const { userId, isAdmin, isManager, role, team } = req.user;

    // Define the query based on user role
    let query = { isTrashed: false };
    
    if (role === 'manager') {
      // Managers only see their team's tasks
      query.teamDepartment = team;
    } else if (!isAdmin) {
      // Team members only see tasks assigned to them
      query.team = { $all: [userId] };
    }

    // Fetch tasks based on the query
    const allTasks = await Task.find(query)
      .populate({
        path: "team",
        select: "name role title email team",
      })
      .sort({ _id: -1 });

    // Get users based on role
    let users = [];
    if (isAdmin) {
      // Admin sees all users
      users = await User.find({ isActive: true })
        .select("name title role isActive createdAt team")
        .limit(10)
        .sort({ _id: -1 });
    } else if (role === 'manager') {
      // Managers only see their team members
      users = await User.find({ team: team, isActive: true })
        .select("name title role isActive createdAt team")
        .limit(10)
        .sort({ _id: -1 });
    }

    // Group tasks by stage and calculate counts
    const groupedTasks = allTasks?.reduce((result, task) => {
      const stage = task.stage;

      if (!result[stage]) {
        result[stage] = 1;
      } else {
        result[stage] += 1;
      }

      return result;
    }, {});

    const graphData = Object.entries(
      allTasks?.reduce((result, task) => {
        const { priority } = task;
        result[priority] = (result[priority] || 0) + 1;
        return result;
      }, {})
    ).map(([name, total]) => ({ name, total }));

    // Calculate total tasks
    const totalTasks = allTasks.length;
    const last10Task = allTasks?.slice(0, 10);

    // Combine results into a summary object
    const summary = {
      totalTasks,
      last10Task,
      users: (isAdmin || role === 'manager') ? users : [],
      tasks: groupedTasks,
      graphData,
    };

    res
      .status(200)
      .json({ status: true, ...summary, message: "Successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

export {
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
};