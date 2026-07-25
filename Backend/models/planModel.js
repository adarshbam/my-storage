import mongoose from "mongoose";
import { model } from "mongoose";

const PlanSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Novice", "Professional", "Ultimate"],
      default: "Novice",
    },

    period: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly", "Yearly"],
      default: "Monthly",
    },

    storage: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
    },

    active: {
      type: Boolean,
      default: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

const Plan = model("Plan", PlanSchema);
export default Plan;
