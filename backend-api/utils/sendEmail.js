import nodemailer from "nodemailer";
import dns from "dns";

// Force IPv4 DNS resolution for cloud hosts like Render that lack IPv6 outbound routing
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

export const sendOtpEmail = async (email, otp, fullName) => {
  try {
    console.log(`\n========================================`);
    console.log(`[EMAIL OTP SYSTEM]`);
    console.log(`Recipient: ${email} (${fullName})`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Sending verification code...`);
    console.log(`========================================\n`);

    const emailHtml = `
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
    `;

    // Priority 1: Brevo.com HTTP REST API (Instant Delivery via HTTPS Port 443 - Never blocked on Render cloud)
    if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.length > 10) {
      try {
        console.log(`[EMAIL OTP SYSTEM] Attempting to send via Brevo HTTP REST API...`);
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": process.env.BREVO_API_KEY.trim(),
          },
          body: JSON.stringify({
            sender: { name: process.env.SMTP_FROM_NAME || "Prodesk IT Chat", email: process.env.SMTP_USER || "abhi5407ass@gmail.com" },
            to: [{ email: email }],
            subject: `${otp} is your Registration Verification Code`,
            htmlContent: emailHtml,
          }),
        });

        const resData = await response.json();
        if (response.ok) {
          console.log(`[EMAIL OTP SYSTEM] Successfully sent email via Brevo REST API to ${email}`);
          return { success: true, method: "brevo" };
        }
        console.error(`[EMAIL OTP SYSTEM ERROR] Brevo API error:`, resData);
      } catch (brevoErr) {
        console.error("[EMAIL OTP BREVO FETCH ERROR]", brevoErr.message || brevoErr);
      }
    }

    // Priority 2: Resend.com API (Instant Delivery on Cloud Hosts like Render & Vercel)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith("re_")) {
      try {
        console.log(`[EMAIL OTP SYSTEM] Attempting to send via Resend.com API...`);
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "Prodesk IT Chat <onboarding@resend.dev>",
            to: [email],
            subject: `${otp} is your Registration Verification Code`,
            html: emailHtml,
          }),
        });

        const resData = await response.json();

        if (response.ok) {
          console.log(`[EMAIL OTP SYSTEM] Successfully sent email via Resend API to ${email} (ID: ${resData.id})`);
          return { success: true, method: "resend" };
        }

        console.error(`[EMAIL OTP SYSTEM ERROR] Resend API error:`, resData.message || resData);
        if (resData.message && resData.message.includes("testing emails to your own email address")) {
          console.warn(`\n⚠️ Resend Free Tier Restriction: Emails can only be delivered to registered email (abhi5407ass@gmail.com).`);
          console.warn(`Attempting SMTP fallback if configured...\n`);
        }
      } catch (resErr) {
        console.error("[EMAIL OTP RESEND FETCH ERROR]", resErr.message || resErr);
      }
    }

    // Priority 2: Nodemailer SMTP
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_USER !== "your_email@gmail.com"
    ) {
      const isGmail = process.env.SMTP_HOST.includes("gmail") || process.env.SMTP_USER.includes("@gmail.com");
      const userEmail = process.env.SMTP_USER.trim();
      const passClean = process.env.SMTP_PASS.replace(/\s+/g, "");

      // Attempt 1: SSL Port 465 with IPv4 lookup
      try {
        console.log(`[EMAIL OTP SYSTEM] Attempting SMTP send to ${email}...`);
        const ipv4Lookup = (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback);

        const transportConfig = isGmail
          ? {
              host: "smtp.gmail.com",
              port: 465,
              secure: true,
              auth: { user: userEmail, pass: passClean },
              lookup: ipv4Lookup,
              connectionTimeout: 20000,
              greetingTimeout: 20000,
              socketTimeout: 20000,
            }
          : {
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT) || 587,
              secure: process.env.SMTP_SECURE === "true",
              auth: { user: userEmail, pass: passClean },
              lookup: ipv4Lookup,
              tls: { rejectUnauthorized: false },
              connectionTimeout: 20000,
              greetingTimeout: 20000,
              socketTimeout: 20000,
            };

        const transporter = nodemailer.createTransport(transportConfig);

        const mailOptions = {
          from: `"${process.env.SMTP_FROM_NAME || "Prodesk IT Chat"}" <${userEmail}>`,
          to: email,
          subject: `${otp} is your Registration Verification Code`,
          html: emailHtml,
        };

        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL OTP SYSTEM] Successfully sent email via SMTP to ${email}`);
        return { success: true, method: "smtp" };
      } catch (smtpError1) {
        console.error("[EMAIL OTP SMTP PORT 465 ERROR]", smtpError1.message || smtpError1);

        // Attempt 2 for Gmail: service "gmail" with IPv4 lookup
        if (isGmail) {
          try {
            console.log(`[EMAIL OTP SYSTEM] Trying Gmail service fallback transport...`);
            const ipv4Lookup = (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback);
            const fallbackTransporter = nodemailer.createTransport({
              service: "gmail",
              auth: { user: userEmail, pass: passClean },
              lookup: ipv4Lookup,
              connectionTimeout: 20000,
            });

            await fallbackTransporter.sendMail({
              from: `"${process.env.SMTP_FROM_NAME || "Prodesk IT Chat"}" <${userEmail}>`,
              to: email,
              subject: `${otp} is your Registration Verification Code`,
              html: emailHtml,
            });

            console.log(`[EMAIL OTP SYSTEM] Successfully sent email via Gmail service fallback to ${email}`);
            return { success: true, method: "gmail_service" };
          } catch (smtpError2) {
            console.error("[EMAIL OTP GMAIL FALLBACK ERROR]", smtpError2.message || smtpError2);
            return { success: false, method: "smtp_error", error: smtpError2.message || String(smtpError2) };
          }
        }

        return { success: false, method: "smtp_error", error: smtpError1.message || String(smtpError1) };
      }
    }

    console.log(`[EMAIL OTP DEV FALLBACK] No active email transport succeeded for ${email}`);
    return { success: false, method: "no_transport", error: "No active email transport configured (Check SMTP_USER / SMTP_PASS on Render)" };
  } catch (error) {
    console.error("[EMAIL OTP SYSTEM CRITICAL ERROR]", error.message || error);
    return { success: false, method: "error", otp };
  }
};


