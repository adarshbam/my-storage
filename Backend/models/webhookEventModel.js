import mongoose from "mongoose";
import { model } from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },

    event: {
      type: String,
      required: true,
    },

    entity: {
      type: String,
      default: "subscription",
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
    },

    processed: {
      type: Boolean,
      default: false,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

const WebhookEvent = model("WebhookEvent", webhookEventSchema);
export default WebhookEvent;
