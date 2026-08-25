import mongoose from "mongoose";

/**
 * Executes an async callback within an ACID MongoDB transaction session.
 *
 * - Automatically initializes a ClientSession and starts a transaction.
 * - Passes the active `session` object to the callback function.
 * - Commits the transaction if the callback executes successfully.
 * - Automatically aborts (rolls back) all database mutations if an error occurs.
 * - Automatically retries on transient errors (WriteConflict, TransientTransactionError) with backoff.
 * - Always ends and releases the session in a finally block.
 *
 * @template T
 * @param {(session: import("mongoose").ClientSession) => Promise<T>} callback
 * @param {number} [maxRetries=3] - Maximum retry attempts for transient write conflicts
 * @returns {Promise<T>}
 */
export async function withTransaction(callback, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    attempt++;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction().catch(() => {});

      const isTransient =
        (error.errorLabels && error.errorLabels.includes("TransientTransactionError")) ||
        (error.errorLabelSet && error.errorLabelSet.has("TransientTransactionError")) ||
        error.code === 112 ||
        error.codeName === "WriteConflict";

      if (isTransient && attempt < maxRetries) {
        const delay = Math.floor(Math.random() * 50 * Math.pow(2, attempt)) + 20;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    } finally {
      session.endSession();
    }
  }
}
