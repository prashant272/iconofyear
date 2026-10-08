import express from "express";
import { getGallery, updateGallery, uploadPhotos } from "../controllers/galleryController.js";
import { authenticate, requireTabPermission } from "../middleware/authMiddleware.js";
import uploadImage from "../middleware/uploadImageMiddleware.js";

const router = express.Router();

router.get("/", getGallery);
router.put("/", authenticate, requireTabPermission("gallery"), updateGallery);
router.post("/upload", authenticate, requireTabPermission("gallery"), uploadImage.array("images", 10), uploadPhotos);

export default router;
