import mongoose from "mongoose";

const planTierSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    badge: {
      type: String,
      default: "",
      trim: true,
    },

    accentColor: {
      type: String,
      default: "#7C3AED",
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const PlanTier = mongoose.model("PlanTier", planTierSchema);

export default PlanTier;
