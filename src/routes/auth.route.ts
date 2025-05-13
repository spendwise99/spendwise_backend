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
import { generateOTP, getOTP, sendOTPEmail } from "../utils/otp";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import bcrypt from "bcryptjs";
import { sendTwilioSMS } from "../utils/twilio.utils";

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
      const { email, userName, firstName, lastName, phoneNumber, age } =
        req.body;

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
      const otp = generateOTP();

      const user = new User({
        email,
        userName,
        firstName,
        lastName,
        phoneNumber,
        // age,
        imageUrl,
      });
      await user.save();
      await sendOTPEmail(email, otp);
      return res
        .status(200)
        .json({ message: "OTP sent to email. Please verify." });
    } catch (err) {
      res.status(500).json({ message: "Signup error", error: err });
    }
  }
);
// Verify OTP
authRoutes.post("/verify-otp", async (req: any, res: any) => {
  const { error } = verifyOtpSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  const { email, otp } = req.body;

  const storedOtpData: any = await getOTP(email);

  if (!storedOtpData) {
    return res
      .status(400)
      .json({ message: "OTP request not found for this email" });
  }

  // Check if OTP is expired
  if (Date.now() > storedOtpData.expiresAt) {
    return res
      .status(400)
      .json({ message: "OTP expired, please request a new one" });
  }

  // Verify OTP
  if (storedOtpData.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // OTP is valid, proceed with user creation
  try {
    await User.findOneAndUpdate({ email }, { isVerified: true });

    res.status(201).json({
      message: "User created and OTP verified successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Error saving user", error: err });
  }
});

authRoutes.post("/set-password", async (req: any, res: any) => {
  // Validate request body using Joi schema
  const { error } = setPasswordSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email first" });
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
      )
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
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email first" });
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
        // age: user.age,
        balance: user.balance,
        isVerified: user.isVerified,
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
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
    await User.findOneAndUpdate({ email }, { otp, otpExpiresAt: expiresAt });
    await sendOTPEmail(email, otp);
    return res.status(200).json({ message: "OTP sent to email" });
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
