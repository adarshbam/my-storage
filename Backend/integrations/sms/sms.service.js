/**
 * SMS Dispatcher Integration
 * Supports Twilio SDK / HTTP or Development Console Provider.
 */

export async function sendSms({ to, message }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const params = new URLSearchParams();
      params.append("To", to);
      params.append("From", fromNumber);
      params.append("Body", message);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[SMS Service] Twilio Error:", errorText);
        throw new Error(`SMS Provider error: status ${res.status}`);
      }

      const data = await res.json();
      console.log(`[SMS Service] SMS dispatched successfully to ${to} (SID: ${data.sid})`);
      return { success: true, messageId: data.sid };
    } catch (err) {
      console.error("[SMS Service] Failed to send SMS via Twilio:", err.message);
      throw err;
    }
  }

  // Development / Fallback Mock Provider
  console.log("=================================================");
  console.log(`[SMS Provider (Dev/Fallback)] Dispatched to: ${to}`);
  console.log(`[SMS Content]: ${message}`);
  console.log("=================================================");

  return { success: true, messageId: `mock_${Date.now()}` };
}
