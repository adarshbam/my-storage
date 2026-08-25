import mongoose from "mongoose";

export default function validateIdMiddleware(req, res, next, id) {
  // Allow integration string IDs (e.g. GitHub 40-char commit/blob SHAs, Google Drive alphanumeric IDs) on starred routes
  if (req.path && req.path.includes("/starred")) {
    return next();
  }

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: `${id} is not a valid ID` });
  }
  next();
}
