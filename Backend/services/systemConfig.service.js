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

export const getSystemConfigLogic = async () => {
  return await getSystemConfigHelper();
};

export const updateSystemConfigLogic = async ({ maxDevicesLimit, maxFileSizeLimit, userRole }) => {
  if (!userRole || userRole.toLowerCase() !== "owner") {
    throw Object.assign(new Error("Access denied. Only Owners can update system configuration."), { status: 403 });
  }

  const updateData = {};

  if (maxDevicesLimit !== undefined) {
    const parsedDevices = parseInt(maxDevicesLimit, 10);
    if (isNaN(parsedDevices) || parsedDevices < 1) {
      throw Object.assign(new Error("Invalid devices limit value."), { status: 400 });
    }
    updateData.maxDevicesLimit = parsedDevices;
  }

  if (maxFileSizeLimit !== undefined) {
    const parsedFileSize = parseInt(maxFileSizeLimit, 10);
    if (isNaN(parsedFileSize) || parsedFileSize < 1) {
      throw Object.assign(new Error("Invalid file size limit value."), { status: 400 });
    }
    updateData.maxFileSizeLimit = parsedFileSize;
  }

  const config = await SystemConfig.findOneAndUpdate(
    { key: "global" },
    { $set: updateData },
    { new: true, upsert: true },
  );

  return { message: "Settings updated successfully", config };
};
