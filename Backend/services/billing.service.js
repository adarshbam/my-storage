import { rzInstance } from "../integrations/razorpay/razorpay.client.js";
import Subscription from "../models/subscriptionModel.js";

/**
 * Retrieves all billing invoices across all historical subscriptions for the user.
 */
export const getInvoicesLogic = async ({ userId }) => {
  const subscriptions = await Subscription.find({
    userId,
    razorpaySubscriptionId: { $exists: true, $ne: null },
  }).sort({ createdAt: -1 });

  if (!subscriptions || subscriptions.length === 0) {
    return { invoices: [] };
  }

  const allInvoices = [];

  for (const sub of subscriptions) {
    if (!sub.razorpaySubscriptionId || sub.razorpaySubscriptionId.startsWith("legacy_")) {
      continue;
    }

    try {
      const response = await rzInstance.invoices.all({
        subscription_id: sub.razorpaySubscriptionId,
      });

      const items = (response.items || []).map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number || inv.id,
        amount: (inv.amount || 0) / 100, // Convert paise to INR
        currency: inv.currency || "INR",
        status: inv.status || "paid",
        date: inv.paid_at
          ? new Date(inv.paid_at * 1000).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : new Date((inv.billing_start || inv.created_at) * 1000).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
        billingStart: inv.billing_start
          ? new Date(inv.billing_start * 1000).toISOString()
          : null,
        billingEnd: inv.billing_end
          ? new Date(inv.billing_end * 1000).toISOString()
          : null,
        period:
          inv.billing_start && inv.billing_end
            ? `${new Date(inv.billing_start * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })} – ${new Date(inv.billing_end * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}`
            : "Monthly Cycle",
        paidAt: inv.paid_at ? new Date(inv.paid_at * 1000).toISOString() : null,
        downloadUrl: inv.short_url || inv.invoice_url || null,
      }));

      allInvoices.push(...items);
    } catch (err) {
      console.warn(
        `[getInvoicesLogic] Error fetching invoices for subscription ${sub.razorpaySubscriptionId}:`,
        err.message,
      );
    }
  }

  // Sort invoices newest first by paidAt or date
  allInvoices.sort((a, b) => new Date(b.paidAt || b.billingStart || 0) - new Date(a.paidAt || a.billingStart || 0));

  return { invoices: allInvoices };
};
