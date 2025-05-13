import express from "express";
import User from "../models/User.model";
import {
  signupSchema,
  loginSchema,
  setPasswordSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  requestNewOtpSchema,
} from "../validator/auth.validator";
import uploadImage from "../middleware/multer.middleware";
import { uploadToCloudinary } from "../utils/cloudinary";
import { generateOTP, sendOTPEmail } from "../utils/otp";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import bcrypt from "bcryptjs";
import { sendTwilioSMS } from "../utils/twilio.utils";
import UserOtp from "../models/UserOtp.model";

const authRoutes = express.Router();

// Signup
authRoutes.post(
  "/signup",
  uploadImage.single("image"),
  async (req: any, res: any) => {
    const { error } = signupSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    try {
      const { email, userName, firstName, lastName, phoneNumber } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: "User already exists" });

      // Upload image to Cloudinary
      let imageUrl = "";
      if (req.file) {
        try {
          imageUrl = await uploadToCloudinary(req.file.buffer);
        } catch (uploadErr) {
          return res
            .status(500)
            .json({ message: "Image upload failed", error: uploadErr });
        }
      }
      const [isPhoneVerified, isEmailVerified] = await Promise.all([
        UserOtp.findOne({ phone: phoneNumber }),
        UserOtp.findOne({ email }),
      ]);
      const user = new User({
        email,
        userName,
        firstName,
        lastName,
        phoneNumber,
        imageUrl,
        isPhoneVerified: isPhoneVerified ? true : false,
        isEmailVerified: isEmailVerified ? true : false,
      });
      await user.save();
      return res.status(200).json({ message: "User created successfully" });
    } catch (err) {
      res.status(500).json({ message: "Signup error", error: err });
    }
  }
);
authRoutes.post("/verify-otp", async (req: any, res: any) => {
  const { error } = verifyOtpSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, phone, otp, type } = req.body;

  let storedOtpData: any;

  if (type === "EMAIL") {
    storedOtpData = await UserOtp.findOne({ email });
  } else if (type === "MOBILE") {
    storedOtpData = await UserOtp.findOne({ phone });
  }

  if (!storedOtpData) {
    return res.status(400).json({ message: `${type} OTP request not found` });
  }

  const otpExpireField =
    type === "EMAIL" ? "emailOtpExpire" : "mobileOtpExpire";
  if (Date.now() > storedOtpData[otpExpireField].getTime()) {
    return res
      .status(400)
      .json({ message: "OTP expired, please request a new one" });
  }

  const otpField = type === "EMAIL" ? "emailOtp" : "mobileOtp";
  if (storedOtpData[otpField] !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  try {
    if (type === "EMAIL") {
      await UserOtp.findOneAndUpdate({ email }, { isEmailVerified: true });
    } else if (type === "MOBILE") {
      await UserOtp.findOneAndUpdate({ phone }, { isMobileVerified: true });
    }

    res.status(200).json({
      message: `${type} verified successfully`,
    });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ message: "Error verifying OTP", error: err });
  }
});

authRoutes.post("/set-password", async (req: any, res: any) => {
  const { error } = setPasswordSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const [isPhoneVerified, isEmailVerified] = await Promise.all([
      UserOtp.findOne({ phone: user.phoneNumber }),
      UserOtp.findOne({ email }),
    ]);
    await User.findOneAndUpdate(
      { email },
      {
        isPhoneVerified: isPhoneVerified ? true : false,
        isEmailVerified: isEmailVerified ? true : false,
      }
    );
    if (!user.isPhoneVerified && !user.isEmailVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email and phone number first" });
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    try {
      await sendTwilioSMS(
        user.phoneNumber,
        `You've signed up in Banking management system App successfully. Your password has been set.`
      );
    } catch (error) {
      console.log(error);
    }

    res.status(200).json({
      message: "Password updated successfully",
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Error setting password:", err);
    res.status(500).json({ message: "Error updating password", error: err });
  }
});

// Login
authRoutes.post("/login", async (req: any, res: any) => {
  // Validate request body using Joi schema
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user is verified before login
    if (!user.isPhoneVerified && !user.isEmailVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email and phone number first" });
    }

    // Compare the password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Generate JWT tokens (access token and refresh token)
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    try {
      await sendTwilioSMS(
        user.phoneNumber,
        `You've logged into Banking management system successfully. Login time: ${new Date().toLocaleString()}`
      );
    } catch (error) {
      console.log(error);
    }

    // Send the response with the tokens
    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.userName,
        imageUrl: user.imageUrl,
        phoneNumber: user.phoneNumber,
        userId: user._id,
        balance: user.balance,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login error", error: err });
  }
});

authRoutes.post("/request-otp", async (req: any, res: any) => {
  const { error } = requestNewOtpSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { type, email, phone } = req.body;
  try {
    if (type === "MOBILE") {
      let existingUserOtp = await UserOtp.findOne({ phone });

      if (!existingUserOtp) {
        existingUserOtp = new UserOtp({ phone });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      existingUserOtp.mobileOtp = otp;
      existingUserOtp.mobileOtpExpire = expiresAt;

      await existingUserOtp.save();

      await sendTwilioSMS(phone, `Your OTP is ${otp}`);
      return res.status(200).json({ message: "OTP sent to mobile" });
    }

    if (type === "EMAIL") {
      let existingUserOtp = await UserOtp.findOne({ email });

      if (!existingUserOtp) {
        existingUserOtp = new UserOtp({ email });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      existingUserOtp.emailOtp = otp;
      existingUserOtp.emailOtpExpire = expiresAt;

      await existingUserOtp.save();

      await sendOTPEmail(email, otp);
      return res.status(200).json({ message: "OTP sent to email" });
    }
  } catch (err) {
    console.error("Error requesting OTP:", err);
    return res
      .status(500)
      .json({ message: "Error requesting OTP", error: err });
  }
});

authRoutes.post("/refresh-token", (req: any, res: any) => {
  const { error } = refreshTokenSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  // Verify the refresh token
  try {
    const userData = verifyRefreshToken(refreshToken); // Decodes and verifies the refresh token

    if (!userData) {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    // Generate new access and refresh tokens
    const newAccessToken = generateAccessToken(userData);
    const newRefreshToken = generateRefreshToken(userData);

    // Return the new tokens
    res.status(200).json({
      message: "Tokens refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken, // New refresh token
    });
  } catch (err) {
    console.error("Error verifying refresh token:", err);
    return res
      .status(500)
      .json({ message: "Error verifying refresh token", error: err });
  }
});

export default authRoutes;
