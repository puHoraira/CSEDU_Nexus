const express = require("express");
const { SearchController } = require("../controllers/SearchController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Global search
router.get("/", SearchController.globalSearch);

// Quick user search for autocomplete
router.get("/users", SearchController.quickSearchUsers);

module.exports = { searchRoutes: router };
