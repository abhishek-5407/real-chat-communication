import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otp, fullName) => {
  try {
    console.log(`\n========================================`);
    console.log(`[EMAIL OTP SYSTEM]`);
    console.log(`Recipient: ${email} (${fullName})`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Sending verification code via SMTP to Gmail...`);
    console.log(`Valid for: 10 minutes`);
    console.log(`========================================\n`);

    // If SMTP credentials are configured in .env, send actual email
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_USER !== "your_email@gmail.com"
    ) {
      const isGmail = process.env.SMTP_HOST.includes("gmail");
      
      const transportConfig = isGmail
        ? {
            service: "gmail",
            auth: {
              user: process.env.SMTP_USER.trim(),
              pass: process.env.SMTP_PASS.replace(/\s+/g, ""),
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 8000,
          }
        : {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
              user: process.env.SMTP_USER.trim(),
              pass: process.env.SMTP_PASS.replace(/\s+/g, ""),
            },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 8000,
          };

      const transporter = nodemailer.createTransport(transportConfig);

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || "Prodesk IT Chat"}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `${otp} is your Registration Verification Code`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background-color: #f4f7f6;">
            <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #6366f1; margin-top: 0;">Prodesk IT Real-Time Portal</h2>
              <p>Hello <strong>${fullName}</strong>,</p>
              <p>Thank you for registering. Please use the verification code below to complete your registration:</p>
              <div style="background-color: #e0e7ff; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4338ca;">${otp}</span>
              </div>
              <p style="font-size: 13px; color: #6b7280;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
            </div>
          </div>
        `,
      };

      // Wrap sendMail with a strict 7-second timeout promise
      const sendPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SMTP email sending timed out after 7 seconds.")), 7000)
      );

      await Promise.race([sendPromise, timeoutPromise]);
      console.log(`[EMAIL OTP SYSTEM] Successfully sent email via SMTP to ${email}`);
    } else {
      console.log(`[EMAIL OTP SYSTEM HINT] To receive real emails on Gmail, update SMTP_USER and SMTP_PASS in backend-api/.env`);
    }

    return true;
  } catch (error) {
    console.error("[EMAIL OTP SYSTEM ERROR]", error.message || error);
    throw error;
  }
};

