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

// PATCH /plans/update-plans (Batch Update All Plans)
export const updatePlansSchema = {
  body: z.object({
    plans: z.array(
      z.object({
        _id: z.string({ required_error: "Plan ID is required" }),
        slug: z.string().optional(),
        amount: z.number().min(0).optional(),
        currency: z.string().optional(),
        storage: z.number().min(0).optional(),
        period: z.enum(["Daily", "Weekly", "Monthly", "Yearly"]).optional(),
        active: z.boolean().optional(),
      })
    ),
  }),
};
