import express from "express";
import {
    createEdition,
    getEditions,
    getEditionByYear,
    updateEdition,
    deleteEdition,
} from "../controllers/upcomingEditionController.js";
import { authenticate, requireTabPermission } from "../middleware/authMiddleware.js";
import uploadAndCompress from "../middleware/imageUploadMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getEditions);
router.get("/:year", getEditionByYear);

// Admin routes
router.post(
    "/",
    authenticate,
    requireTabPermission("upcoming-editions"),
    ...uploadAndCompress("images", 100), // Allow up to 100 images per upload
    createEdition
);

router.put(
    "/:id",
    authenticate,
    requireTabPermission("upcoming-editions"),
    ...uploadAndCompress("newImages", 100), // Allow uploading additional images during edit
    updateEdition
);

router.delete("/:id", authenticate, requireTabPermission("upcoming-editions"), deleteEdition);

export default router;
