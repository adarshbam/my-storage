import SystemConfig from "../models/systemConfigModel.js";

// Helper to get configuration, ensuring a document always exists
export const getSystemConfigHelper = async () => {
  let config = await SystemConfig.findOne({ key: "global" });
  if (!config) {
    config = await SystemConfig.create({
      key: "global",
      maxDevicesLimit: 3,
      maxFileSizeLimit: 50 * 1024 * 1024,
    });
  }
  return config;
};

// GET /system-config
export const getSystemConfig = async (req, res) => {
  try {
    const config = await getSystemConfigHelper();
    res.status(200).json(config);
  } catch (err) {
    console.error("Error getting system config:", err);
    res.status(500).json({ error: "Failed to load system settings" });
  }
};

// PATCH /system-config
export const updateSystemConfig = async (req, res) => {
  try {
    if (!req.user?.role || req.user.role.toLowerCase() !== "owner") {
      return res.status(403).json({ error: "Access denied. Only Owners can update system configuration." });
    }

    const { maxDevicesLimit, maxFileSizeLimit } = req.body;
    const updateData = {};

    if (maxDevicesLimit !== undefined) {
      const parsedDevices = parseInt(maxDevicesLimit, 10);
      if (isNaN(parsedDevices) || parsedDevices < 1) {
        return res.status(400).json({ error: "Invalid devices limit value." });
      }
      updateData.maxDevicesLimit = parsedDevices;
    }

    if (maxFileSizeLimit !== undefined) {
      const parsedFileSize = parseInt(maxFileSizeLimit, 10);
      if (isNaN(parsedFileSize) || parsedFileSize < 1) {
        return res.status(400).json({ error: "Invalid file size limit value." });
      }
      updateData.maxFileSizeLimit = parsedFileSize;
    }

    const config = await SystemConfig.findOneAndUpdate(
      { key: "global" },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: "Settings updated successfully", config });
  } catch (err) {
    console.error("Error updating system config:", err);
    res.status(500).json({ error: "Failed to update system settings" });
  }
};
