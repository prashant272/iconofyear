import jwt from "jsonwebtoken";
import config from "../config/config.js";

const JWT_SECRET = config.JWT_SECRET;

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Super admin privileges required" });
  }
  return next();
}

export function requireAdminOrSubadmin(req, res, next) {
  if (!req.user || !["admin", "subadmin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin or Sub-Admin access required" });
  }
  return next();
}

export function requireTabPermission(tabName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role === "admin") {
      return next();
    }
    if (req.user.role === "subadmin") {
      const allowed = Array.isArray(req.user.allowedTabs) ? req.user.allowedTabs : [];
      if (allowed.includes(tabName)) {
        return next();
      }
    }
    return res.status(403).json({ message: `Access denied to ${tabName}` });
  };
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
} 







