import express from "express";
import User from "../models/User.model";
import { userUpdateSchema } from "../validator/user.validator";
import { uploadToCloudinary } from "../utils/cloudinary";
import uploadImage from "../middleware/multer.middleware";
const userRoutes = express.Router();

userRoutes.get("/", async (req: any, res: any) => {
  try {
    const requestedUser = req.user;
    const user = await User.findOne({
      _id: requestedUser.userId,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User details fetched successfully",
      data: {
        userId: user._id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        imageUrl: user.imageUrl,
        balance: user.balance,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user details", error });
  }
});

userRoutes.get("/all", async (req: any, res: any) => {
  try {
    const users = await User.find({ isVerified: true }).select(
      "-password -otp -otpExpiresAt"
    );
    if (!users) {
      return res.status(404).json({ message: "No users found" });
    }
    res.status(200).json({
      message: "Users fetched successfully",
      data: users.map((user) => ({
        userId: user._id,
        userName: user.userName,
        email: user.email,
        imageUrl: user.imageUrl,
        role: user.role,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
});

userRoutes.patch("/", async (req: any, res: any) => {
  const { error } = userUpdateSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const requestedUser = req.user;
    const { firstName, lastName, phoneNumber,  userName } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: requestedUser.userId },
      { firstName, lastName, phoneNumber,  userName },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User details updated successfully",
      data: {
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
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user details", error });
  }
});

userRoutes.delete("/", async (req: any, res: any) => {
  try {
    const requestedUser = req.user;
    const user = await User.findOneAndDelete({
      _id: requestedUser.userId,
    });
    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
});

userRoutes.put(
  "/profile-picture",
  uploadImage.single("image"),
  async (req: any, res: any) => {
    try {
      const requestedUser = req.user;
      let imageUrl = "";
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      imageUrl = await uploadToCloudinary(req.file.buffer);
      const user = await User.findOneAndUpdate(
        { _id: requestedUser.userId },
        { imageUrl },
        { new: true }
      );
      res.status(200).json({
        message: "Profile picture updated successfully",
        data: {
          imageUrl: user!.imageUrl,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error updating profile picture", error });
    }
  }
);

export default userRoutes;
