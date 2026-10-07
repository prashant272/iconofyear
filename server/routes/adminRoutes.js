import express from "express";
import bcrypt from "bcryptjs";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import User from "../models/User.js";
import Nomination from "../models/Nomination.js";
import Inquiry from "../models/Inquiry.js";
import {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
  requireAdminOrSubadmin,
  requireTabPermission,
  signToken,
} from "../middleware/authMiddleware.js";
import s3Client from "../utils/s3Config.js";
import config from "../config/config.js";

const router = express.Router();

const BUCKET_NAME = config.AWS.BUCKET_NAME;

// Helper to generate signed URL
const getSignedPdfUrl = async (key) => {
  if (!key) return "";
  try {
    let s3Key = key;
    // Handle legacy full URLs for admin too
    if (key.startsWith("http")) {
      const urlObj = new URL(key);
      if (urlObj.hostname.includes("amazonaws.com") && urlObj.pathname.includes(BUCKET_NAME)) {
        const pathParts = urlObj.pathname.split("/");
        const bucketIndex = pathParts.indexOf(BUCKET_NAME);
        if (bucketIndex !== -1) {
          s3Key = pathParts.slice(bucketIndex + 1).join("/");
        } else {
          s3Key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
        }
      } else {
        return key;
      }
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: decodeURIComponent(s3Key),
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: 'inline'
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (err) {
    console.error("Error generating signed URL for admin:", err);
    return "";
  }
};

// Admin & Sub-Admin login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!["admin", "subadmin"].includes(user.role)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const allowedTabs = user.role === "admin"
      ? ["nominations", "status", "analytics", "users", "gallery", "inquiries", "previous-editions", "upcoming-editions", "admins"]
      : (Array.isArray(user.allowedTabs) ? user.allowedTabs : []);

    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      allowedTabs,
    });

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        allowedTabs,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================================
   SUB-ADMIN USER MANAGEMENT (SUPER ADMIN ONLY)
========================================================================= */

// List all sub-admins with their assigned nomination count
router.get("/subadmins", authenticate, requireSuperAdmin, async (_req, res, next) => {
  try {
    const subadmins = await User.find({ role: "subadmin" })
      .select("_id name email allowedTabs createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // Count assigned nominations for each subadmin
    const counts = await Nomination.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => {
      if (c._id) countMap[c._id.toString()] = c.count;
    });

    const results = subadmins.map((s) => ({
      ...s,
      assignedCount: countMap[s._id.toString()] || 0,
    }));

    return res.json(results);
  } catch (err) {
    next(err);
  }
});

// Create a new sub-admin with custom/generated credentials and tab permissions
router.post("/subadmins", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    let { name, email, password, allowedTabs } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    // Auto-generate strong password if not provided
    if (!password || password.trim() === "") {
      const rand1 = Math.random().toString(36).slice(-4).toUpperCase();
      const rand2 = Math.random().toString(36).slice(-4);
      password = `Icon@${rand1}${rand2}!`;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password.trim(), salt);

    if (!Array.isArray(allowedTabs)) {
      allowedTabs = ["nominations"];
    }

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: "subadmin",
      allowedTabs,
      isVerified: true,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        allowedTabs: newUser.allowedTabs,
        createdAt: newUser.createdAt,
      },
      generatedPassword: password.trim(),
    });
  } catch (err) {
    next(err);
  }
});

// Update an existing sub-admin (name, allowedTabs, or reset password)
router.patch("/subadmins/:id", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { name, allowedTabs, password } = req.body || {};
    const updates = {};
    if (name) updates.name = name.trim();
    if (Array.isArray(allowedTabs)) updates.allowedTabs = allowedTabs;
    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, role: "subadmin" },
      updates,
      { new: true }
    ).select("_id name email allowedTabs createdAt");

    if (!updated) {
      return res.status(404).json({ message: "Sub-admin not found" });
    }

    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete a sub-admin and unassign their nominations
router.delete("/subadmins/:id", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const deleted = await User.findOneAndDelete({ _id: req.params.id, role: "subadmin" });
    if (!deleted) {
      return res.status(404).json({ message: "Sub-admin not found" });
    }

    // Unassign nominations previously assigned to this subadmin
    await Nomination.updateMany({ assignedTo: req.params.id }, { assignedTo: null });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* =========================================================================
   NOMINATIONS MANAGEMENT (SCOPED PER ROLE / PERMISSIONS)
========================================================================= */

// List nominations (Super Admin sees all; Sub-Admin sees only assigned nominations)
router.get("/nominations", authenticate, requireTabPermission("nominations"), async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === "subadmin") {
      filter.assignedTo = req.user.id;
    }

    const docs = await Nomination.find(filter)
      .populate("user", "email name role")
      .populate("assignedTo", "email name role allowedTabs")
      .sort({ createdAt: -1 })
      .lean();

    // Generate signed URLs for PDFs
    const results = await Promise.all(
      docs.map(async (doc) => {
        if (doc.pdfUrl) {
          doc.pdfUrl = await getSignedPdfUrl(doc.pdfUrl);
        }
        return doc;
      })
    );

    return res.json(results);
  } catch (err) {
    next(err);
  }
});

// Assign nomination to a sub-admin (Super Admin only)
router.patch("/nominations/:id/assign", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { assignedTo } = req.body || {};
    let targetUserId = null;

    if (assignedTo && assignedTo !== "unassigned") {
      const assignee = await User.findById(assignedTo);
      if (!assignee) {
        return res.status(400).json({ message: "Assigned user not found" });
      }
      targetUserId = assignee._id;
    }

    const updated = await Nomination.findByIdAndUpdate(
      req.params.id,
      { assignedTo: targetUserId },
      { new: true }
    )
      .populate("user", "email name role")
      .populate("assignedTo", "email name role allowedTabs");

    if (!updated) return res.status(404).json({ message: "Nomination not found" });
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Update nomination status (Super Admin or Sub-Admin for their assigned nomination)
router.patch("/nominations/:id/status", authenticate, requireTabPermission("nominations"), async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const existing = await Nomination.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Nomination not found" });

    // Enforce sub-admin access scoping
    if (req.user.role === "subadmin" && String(existing.assignedTo) !== String(req.user.id)) {
      return res.status(403).json({ message: "Access denied to this nomination" });
    }

    existing.status = status;
    await existing.save();

    const populated = await Nomination.findById(existing._id)
      .populate("user", "email name role")
      .populate("assignedTo", "email name role allowedTabs");

    return res.json(populated);
  } catch (err) {
    next(err);
  }
});

// Update nomination details (Super Admin or Sub-Admin for their assigned nomination)
router.put("/nominations/:id", authenticate, requireTabPermission("nominations"), async (req, res, next) => {
  try {
    const payload = req.body || {};
    delete payload.user;

    const existing = await Nomination.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Nomination not found" });

    // Enforce sub-admin access scoping
    if (req.user.role === "subadmin") {
      if (String(existing.assignedTo) !== String(req.user.id)) {
        return res.status(403).json({ message: "Access denied to this nomination" });
      }
      // Sub-admin cannot reassign nominations
      delete payload.assignedTo;
    }

    const updated = await Nomination.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("user", "email name role")
      .populate("assignedTo", "email name role allowedTabs");

    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete nomination (Super Admin only)
router.delete("/nominations/:id", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const deleted = await Nomination.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Nomination not found" });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* =========================================================================
   INQUIRIES (PROTECTED BY TAB PERMISSION)
========================================================================= */

// Fetch list of verified inquiries (Super Admin or Sub-Admin with 'inquiries' tab permission)
router.get("/inquiries", authenticate, requireTabPermission("inquiries"), async (_req, res, next) => {
  try {
    const docs = await Inquiry.find({ isVerified: true })
      .sort({ createdAt: -1 })
      .lean();
    return res.json(docs);
  } catch (err) {
    next(err);
  }
});

// Delete an inquiry (Super Admin only)
router.delete("/inquiries/:id", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const deleted = await Inquiry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Inquiry not found" });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
