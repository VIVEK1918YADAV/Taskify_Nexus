import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import createJWT from "../utils/index.js";
import Notice from "../models/notis.js";

// POST request - login user
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res
      .status(401)
      .json({ status: false, message: "Invalid email or password." });
  }

  if (!user?.isActive) {
    return res.status(401).json({
      status: false,
      message: "User account has been deactivated, contact the administrator",
    });
  }

  const isMatch = await user.matchPassword(password);

  if (user && isMatch) {
    createJWT(res, user._id);

    user.password = undefined;

    res.status(200).json(user);
  } else {
    return res
      .status(401)
      .json({ status: false, message: "Invalid email or password" });
  }
});

// POST - Register a new user
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, isAdmin, isManager, role, title, team, managerId } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res
      .status(400)
      .json({ status: false, message: "Email address already exists" });
  }

  // Validate team field for non-admin roles
  if ((role === 'manager' || role === 'team_lead' || role === 'team_member') && !team) {
    return res
      .status(400)
      .json({ status: false, message: "User validation failed: team: Path 'team' is required." });
  }

  // Validate managerId for team_lead and team_member roles
  if ((role === 'team_lead' || role === 'team_member') && !managerId) {
    return res
      .status(400)
      .json({ status: false, message: "User validation failed: managerId: Path 'managerId' is required., team: Path 'team' is required." });
  }

  try {
    const user = await User.create({
      name,
      email,
      password,
      isAdmin,
      isManager,
      role,
      title,
      ...(team && { team }),
      ...(managerId && { managerId })
    });

    if (user) {
      isAdmin ? createJWT(res, user._id) : null;

      user.password = undefined;

      res.status(201).json(user);
    } else {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user data" });
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res
        .status(400)
        .json({ status: false, message: messages.join(', ') });
    } else {
      return res
        .status(500)
        .json({ status: false, message: "Server error while creating user" });
    }
  }
});

// POST -  Logout user / clear cookie
const logoutUser = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};

// Get team list - modified to respect manager permissions
const getTeamList = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const { userId, isAdmin, isManager, role } = req.user;
  
  let query = {};

  // If admin, can see all users
  // If manager, can only see users in their team
  if (!isAdmin && role === 'manager') {
    const manager = await User.findById(userId);
    if (manager && manager.team) {
      query.team = manager.team;
    }
  }

  if (search) {
    const searchQuery = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };
    query = { ...query, ...searchQuery };
  }

  const users = await User.find(query).select("name title role email team isActive managerId");
  
  // Enhance user objects with manager info where applicable
  const populatedUsers = await Promise.all(users.map(async (user) => {
    const userObject = user.toObject();
    
    // If user has managerId, get manager's name
    if (user.managerId) {
      const manager = await User.findById(user.managerId).select("name");
      userObject.manager = manager ? manager.name : "Not Assigned";
    } else {
      userObject.manager = "N/A";
    }
    
    return userObject;
  }));

  res.status(200).json(populatedUsers);
});

// @GET  - get user notifications
const getNotificationsList = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const notice = await Notice.find({
    team: userId,
    isRead: { $nin: [userId] },
  })
    .populate("task", "title")
    .sort({ _id: -1 });

  res.status(201).json(notice);
});

// @GET  - get user notifications
const markNotificationRead = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;
    const { isReadType, id } = req.query;

    if (isReadType === "all") {
      await Notice.updateMany(
        { team: userId, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } },
        { new: true }
      );
    } else {
      await Notice.findOneAndUpdate(
        { _id: id, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } },
        { new: true }
      );
    }
    res.status(201).json({ status: true, message: "Done" });
  } catch (error) {
    console.log(error);
  }
});

// PUT - Update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
  const { userId, isAdmin } = req.user;
  const { _id } = req.body;

  const id =
    isAdmin && userId === _id
      ? userId
      : isAdmin && userId !== _id
      ? _id
      : userId;

  const user = await User.findById(id);

  if (user) {
    user.name = req.body.name || user.name;
    // user.email = req.body.email || user.email;
    user.title = req.body.title || user.title;
    user.role = req.body.role || user.role;
    
    // Handle team updates
    if (req.body.team) {
      user.team = req.body.team;
    }
    
    // Handle managerId updates
    if (req.body.managerId !== undefined) {
      user.managerId = req.body.managerId || null;
    }

    const updatedUser = await user.save();

    updatedUser.password = undefined;

    res.status(201).json({
      status: true,
      message: "Profile Updated Successfully.",
      user: updatedUser,
    });
  } else {
    res.status(404).json({ status: false, message: "User not found" });
  }
});

// PUT - active/disactivate user profile
const activateUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (user) {
    user.isActive = req.body.isActive;

    await user.save();

    user.password = undefined;

    res.status(201).json({
      status: true,
      message: `User account has been ${
        user?.isActive ? "activated" : "disabled"
      }`,
    });
  } else {
    res.status(404).json({ status: false, message: "User not found" });
  }
});

const changeUserPassword = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  // Remove this condition
  if (userId === "65ff94c7bb2de638d0c73f63") {
    return res.status(404).json({
      status: false,
      message: "This is a test user. You can not change password. Thank you!!!",
    });
  }

  const user = await User.findById(userId);

  if (user) {
    user.password = req.body.password;

    await user.save();

    user.password = undefined;

    res.status(201).json({
      status: true,
      message: `Password changed successfully.`,
    });
  } else {
    res.status(404).json({ status: false, message: "User not found" });
  }
});

// DELETE - delete user account
const deleteUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await User.findByIdAndDelete(id);

  res.status(200).json({ status: true, message: "User deleted successfully" });
});

// GET - Get managers list (filtered by team if provided)
const getManagersList = asyncHandler(async (req, res) => {
  try {
    const { team } = req.query;
    
    // Base query to find active managers
    let query = { 
      role: "manager", 
      isActive: true 
    };
    
    // Add team filter if team is provided
    if (team) {
      query.team = team;
    }
    
    const managers = await User.find(query).select('name _id team');

    res.status(200).json(managers);
  } catch (error) {
    res.status(500).json({ 
      status: false, 
      message: "Error fetching managers list" 
    });
  }
});

// GET - Get teams list
const getTeamsList = asyncHandler(async (req, res) => {
  try {
    // Return the list of available teams
    const teams = ["Development", "Sales", "Infrastructure", "Design", "Marketing"];
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching teams list"
    });
  }
});

// GET - Get team members under a manager - modified to respect manager permissions
const getTeamMembers = asyncHandler(async (req, res) => {
  const { userId, isAdmin, isManager, role } = req.user;
  const { managerId } = req.params;
  
  try {
    // If the requesting user is a manager but not the specified manager
    // and not an admin, they can only see their own team members
    if (role === 'manager' && !isAdmin && userId !== managerId) {
      return res.status(403).json({
        status: false,
        message: "You can only view your own team members"
      });
    }
    
    const teamMembers = await User.find({
      managerId: managerId,
      isActive: true
    }).select('name _id role team');
    
    res.status(200).json(teamMembers);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching team members"
    });
  }
});

// PUT - Assign manager to user
const assignManager = asyncHandler(async (req, res) => {
  const { userId, managerId } = req.body;
  const { userId: currentUserId, isAdmin, isManager, role } = req.user;
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found"
      });
    }
    
    // Check if the manager exists
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      return res.status(400).json({
        status: false,
        message: "Invalid manager selection"
      });
    }
    
    // Only admins can assign any manager
    // Managers can only assign themselves as managers to users within their team
    if (!isAdmin && role === 'manager') {
      if (currentUserId !== managerId) {
        return res.status(403).json({
          status: false,
          message: "You can only assign yourself as a manager"
        });
      }
      
      // Get the current manager's team
      const currentManager = await User.findById(currentUserId);
      if (user.team !== currentManager.team) {
        return res.status(403).json({
          status: false,
          message: "You can only assign managers to users in your team"
        });
      }
    }
    
    user.managerId = managerId;
    await user.save();
    
    res.status(200).json({
      status: true,
      message: "Manager assigned successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error assigning manager"
    });
  }
});

// GET - Get manager hierarchy
const getManagerHierarchy = asyncHandler(async (req, res) => {
  const { managerId } = req.params;
  
  try {
    const hierarchy = [];
    let currentManagerId = managerId;
    
    // Prevent infinite loops by limiting depth
    let maxDepth = 5;
    
    while (currentManagerId && maxDepth > 0) {
      const manager = await User.findById(currentManagerId).select('name _id role managerId');
      if (!manager) break;
      
      hierarchy.push(manager);
      currentManagerId = manager.managerId;
      maxDepth--;
    }
    
    res.status(200).json(hierarchy);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching manager hierarchy"
    });
  }
});

// New function: Get team members for task assignment
const getTeamMembersForTaskAssignment = asyncHandler(async (req, res) => {
  const { userId, isAdmin, isManager, role } = req.user;
  
  try {
    let query = { isActive: true };
    
    // If admin, can assign to anyone
    // If manager, can only assign to their team members
    if (!isAdmin && role === 'manager') {
      // Get manager's team
      const manager = await User.findById(userId);
      if (!manager) {
        return res.status(404).json({
          status: false,
          message: "Manager not found"
        });
      }
      
      // Get team members with the same team as manager
      query.team = manager.team;
      
      // This will get team leads and team members, excludes other managers
      query.role = { $in: ['team_lead', 'team_member'] };
    }
    
    const teamMembers = await User.find(query).select('name _id role team title');
    
    res.status(200).json(teamMembers);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching team members for task assignment"
    });
  }
});

// Middleware function to check if user is a manager
const isManagerMiddleware = asyncHandler(async (req, res, next) => {
  const { role } = req.user;
  
  if (role !== 'manager') {
    return res.status(403).json({
      status: false,
      message: "Access denied: Only managers can perform this action"
    });
  }
  
  next();
});

// NEW: Verify token endpoint for client-side validation
const verifyToken = asyncHandler(async (req, res) => {
  // If this route is reached through the protectRoute middleware, 
  // it means the token is valid and user is authenticated
  const { userId } = req.user;
  
  // Get user data without sensitive information
  const user = await User.findById(userId).select('-password');
  
  if (!user) {
    return res.status(401).json({ 
      valid: false, 
      message: "User not found" 
    });
  }
  
  res.status(200).json({ 
    valid: true, 
    user: user 
  });
});

export {
  activateUserProfile,
  changeUserPassword,
  deleteUserProfile,
  getTeamList,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
  getNotificationsList,
  markNotificationRead,
  getManagersList,
  getTeamsList,
  assignManager,
  getTeamMembers,
  getManagerHierarchy,
  getTeamMembersForTaskAssignment,
  isManagerMiddleware,
  verifyToken,  // Added the new function to exports
};