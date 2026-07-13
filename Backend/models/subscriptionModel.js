import { Schema, model } from "mongoose";

import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: [
        "created",
        "authenticated",
        "active",
        "pending",
        "halted",
        "cancelled",
        "completed",
        "expired",
      ],
      default: "created",
    },

    amount: {
      type: Number,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

const Subscription = model("Subscription", subscriptionSchema);
export default Subscription;
