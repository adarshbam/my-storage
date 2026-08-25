import { z } from "zod";

// POST /plans/create-plan
export const createPlanSchema = {
  body: z.object({
    type: z.string(),
    amount: z.number().min(1),
    currency: z.string().min(1, "Currency of the Plan is required"),
    storage: z.number().min(0),
    period: z.enum(["Daily", "Weekly", "Monthly", "Yearly"]),
  }),
};

const singlePlanSchema = z
  .object({
    _id: z.string().optional(),
    slug: z.string().optional(),
    amount: z.coerce.number().min(0).optional(),
    currency: z.string().optional(),
    storage: z.coerce.number().min(0).optional(),
    period: z.string().optional(),
    active: z.boolean().optional(),
    razorpayPlanId: z.string().optional(),
  })
  .passthrough();

// PATCH /plans/update-plans (Batch Update All Plans)
export const updatePlansSchema = {
  body: z.union([
    z
      .object({
        plans: z.array(singlePlanSchema),
      })
      .passthrough(),
    z.array(singlePlanSchema),
  ]),
};
