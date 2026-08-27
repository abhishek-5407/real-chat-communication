import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sendOtpEmail } from "../utils/sendEmail.js";

// Helper to generate 6-digit numeric OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 1. Initiates registration by saving user data and sending Email OTP
export const sendOtp = async (req, res) => {
  try {
    const { fullName, email, username, password } = req.body;

    if (!fullName || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields (Full Name, Email, Username, Password) are required.",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();

    // Check if email is already registered and verified
    const existingEmailUser = await User.findOne({ email: trimmedEmail });
    if (existingEmailUser && existingEmailUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered and verified. Please login.",
      });
    }

    // Check if username is already registered and verified by another user
    const existingUsernameUser = await User.findOne({ username: trimmedUsername });
    if (existingUsernameUser && existingUsernameUser.isVerified && existingUsernameUser.email !== trimmedEmail) {
      return res.status(400).json({
        success: false,
        message: "Username is already taken. Please choose a different username.",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP & Expiry (10 mins)
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    let user = existingEmailUser;

    if (user) {
      // Update unverified user details
      user.fullName = fullName.trim();
      user.username = trimmedUsername;
      user.password = hashedPassword;
      user.otp = otp;
      user.otpExpires = otpExpires;
      user.isVerified = false;
    } else {
      // Create new user record
      user = new User({
        fullName: fullName.trim(),
        email: trimmedEmail,
        username: trimmedUsername,
        password: hashedPassword,
        otp: otp,
        otpExpires: otpExpires,
        isVerified: false,
      });
    }

    await user.save();

    // Send OTP email
    const emailResult = await sendOtpEmail(trimmedEmail, otp, fullName.trim());

    let message = `OTP sent successfully to ${trimmedEmail}.`;
    if (!emailResult?.success) {
      if (emailResult?.method === "resend_restricted") {
        message = `Resend free tier only delivers to registered email (abhi5407ass@gmail.com). [DEV MODE OTP: ${otp}]`;
      } else {
        message = `Email transport fallback triggered. [DEV MODE OTP: ${otp}]`;
      }
    }

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error in sendOtp:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while processing registration. Please try again.",
    });
  }
};

// 2. Verifies OTP and completes registration
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email. Please register first.",
      });
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "User is already verified. Please proceed to login.",
      });
    }

    if (user.otp !== trimmedOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP verification code. Please check and try again.",
      });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP code has expired. Please click Resend OTP to get a new code.",
      });
    }

    // Mark as verified and clear OTP
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now log in with your credentials.",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during OTP verification.",
    });
  }
};

// 3. User Login with Email & Password
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password.",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is not verified yet. Please complete OTP verification first.",
        needsVerification: true,
        email: user.email,
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login.",
    });
  }
};

// 4. Resend OTP
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No registration record found for this email.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account is already verified. You can log in directly.",
      });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const emailResult = await sendOtpEmail(trimmedEmail, otp, user.fullName);

    let message = `A new OTP has been sent to ${trimmedEmail}.`;
    if (!emailResult?.success) {
      if (emailResult?.method === "resend_restricted") {
        message = `Resend free tier only delivers to registered email (abhi5407ass@gmail.com). [DEV MODE OTP: ${otp}]`;
      } else {
        message = `Email transport fallback triggered. [DEV MODE OTP: ${otp}]`;
      }
    }

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error in resendOtp:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP.",
    });
  }
};
