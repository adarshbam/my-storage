import mongoose from "mongoose";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_SEVERITIES,
} from "../constants/notification.constants.js";

const { Schema, model } = mongoose;

const actionSchema = new Schema(
  {
    label: { type: String, trim: true, default: null },
    route: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    severity: {
      type: String,
      enum: Object.values(NOTIFICATION_SEVERITIES),
      required: true,
      default: NOTIFICATION_SEVERITIES.INFO,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: actionSchema,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    dismissedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    eventKey: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

// ── Database Indexes ──

// 1. Partial Unique Index for Active Event-based Idempotency (Deduplication)
// Guarantees at the DB layer that a user cannot have two active unresolved notifications with the same eventKey
notificationSchema.index(
  { userId: 1, eventKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      eventKey: { $type: "string" },
      resolvedAt: null,
    },
  },
);

// 2. High-performance index for fetching active / unread / undismissed notifications
notificationSchema.index({ userId: 1, readAt: 1, dismissedAt: 1 });

// 3. Chronological pagination index
notificationSchema.index({ userId: 1, createdAt: -1 });

// 4. Type & Resolution status lookup
notificationSchema.index({ userId: 1, type: 1, resolvedAt: 1 });

// 5. Automatic expiration for temporary announcements (only when expiresAt is an explicit date)
notificationSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $type: "date" } },
  },
);

const Notification = model("Notification", notificationSchema);
export default Notification;
