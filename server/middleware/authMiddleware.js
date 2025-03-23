import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const protectRoute = asyncHandler(async (req, res, next) => {
  let token = req.cookies.token;

  if (token) {
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

      const resp = await User.findById(decodedToken.userId).select(
        "isAdmin isManager email role team managerId"
      );

      req.user = {
        email: resp.email,
        isAdmin: resp.isAdmin,
        isManager: resp.isManager,
        userId: decodedToken.userId,
        role: resp.role,
        team: resp.team,
        managerId: resp.managerId
      };

      next();
    } catch (error) {
      console.error(error);
      return res
        .status(401)
        .json({ status: false, message: "Not authorized. Try login again." });
    }
  } else {
    return res
      .status(401)
      .json({ status: false, message: "Not authorized. Try login again." });
  }
});

const isAdminRoute = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res.status(401).json({
      status: false,
      message: "Not authorized as admin. Try login as admin.",
    });
  }
};

// New middleware for manager permissions
const isManagerRoute = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.role === 'manager')) {
    next();
  } else {
    return res.status(401).json({
      status: false,
      message: "Not authorized. Only managers can perform this action.",
    });
  }
};

export { isAdminRoute, protectRoute, isManagerRoute };