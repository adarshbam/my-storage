import Razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";

const rzInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createSubscription = async (req, res, next) => {
  console.log(req.body);
  const { planId } = req.body;
  console.log(req.user.id);
  try {
    const newSubscription = await rzInstance.subscriptions.create({
      plan_id: planId,
      total_count: 120,
      notes: {
        userId: req.user.id,
      },
    });

    console.log(newSubscription);

    if (!newSubscription) {
      return res.status(404).json({ message: "Subscription not created" });
    }

    const subscription = await Subscription.create({
      razorpaySubscriptionId: newSubscription.id,
      userId: req.user.id,
    });

    console.log(subscription);

    await res.json({ subscriptionId: newSubscription.id });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
