import nodemailer from "nodemailer";

export default async function sendEmail(mail) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // use STARTTLS (upgrade connection to TLS after connecting)
    auth: {
      user: process.env.SMTP_USER || "adarshsingh800515@gmail.com",
      pass: process.env.SMTP_PASS || "ukui pftm aeos sgza",
    },
  });

  try {
    const info = await transporter.sendMail(mail);

    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (err) {
    console.error("Error while sending mail:", err);
    throw err;
  }
}
