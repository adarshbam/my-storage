import mongoose from "mongoose";

const featureSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: [
        "Storage",
        "Sharing",
        "Security",
        "Performance",
        "Integrations",
        "Support",
        "AI",
      ],
      default: "Storage",
    },

    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Feature = mongoose.model("Feature", featureSchema);
export default Feature;
