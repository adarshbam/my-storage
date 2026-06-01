import express from "express";
import { loginLimiter } from "./middlewares/rateLimiter.js";

const app = express();
app.use(express.json());

// Apply our rate limiter to a mock test route
app.post("/test-login", loginLimiter, (req, res) => {
  res.status(200).json({ success: true, message: "Logged in!" });
});

const server = app.listen(5001, async () => {
  console.log("Mock server started on port 5001");
  console.log("Starting rate limit test for /test-login...");
  
  let rateLimitTriggered = false;

  for (let i = 1; i <= 12; i++) {
    try {
      const response = await fetch("http://localhost:5001/test-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "password" }),
      });
      
      console.log(`Request #${i}: Status = ${response.status}`);
      
      if (response.status === 429) {
        const body = await response.json();
        console.log("\n✅ Rate limit triggered successfully on request #" + i + "!");
        console.log("Response Body:", JSON.stringify(body, null, 2));
        
        console.log("Rate limit headers:");
        console.log("  ratelimit-limit:", response.headers.get("ratelimit-limit"));
        console.log("  ratelimit-remaining:", response.headers.get("ratelimit-remaining"));
        console.log("  ratelimit-reset:", response.headers.get("ratelimit-reset"));
        
        rateLimitTriggered = true;
        break;
      }
    } catch (error) {
      console.error(`Request #${i} failed:`, error.message);
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Close the server and exit the process
  server.close(() => {
    console.log("Mock server closed.");
    if (rateLimitTriggered) {
      process.exit(0);
    } else {
      console.log("\n❌ Rate limit was not triggered!");
      process.exit(1);
    }
  });
});
