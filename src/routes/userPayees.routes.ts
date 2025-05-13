import express from "express";
import { userPayeePostSchema } from "../validator/user.payee.validator";
import UserPayees from "../models/UserPayees.model";
import User from "../models/User.model";

const userPayeeRoutes = express.Router();

userPayeeRoutes.post("/", async (req: any, res: any) => {
  const { error } = userPayeePostSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const requestedUser = req.user;
    const payeeId = req.body.payeeId;

    const payeeExists = await User.findOne({
      _id: payeeId,
    });

    if (requestedUser.userId === payeeId) {
      return res
        .status(400)
        .json({ message: "You cannot add yourself as a payee" });
    }

    if (!payeeExists) {
      return res.status(404).json({ message: "Payee not found" });
    }

    if (payeeExists.isPhoneVerified === false && payeeExists.isEmailVerified === false) {
      return res.status(400).json({ message: "Payee is not verified" });
    }

    const existingUserPayeeData = await UserPayees.findOne({
      userId: requestedUser.userId,
    });
    existingUserPayeeData?.addedPayees?.forEach((payee: any) => {
      if (payee === payeeId) {
        return res.status(400).json({ message: "Payee already exists" });
      }
    });
    let response;
    if (!existingUserPayeeData) {
      response = await UserPayees.create({
        userId: requestedUser.userId,
        addedPayees: [payeeId],
      });
    } else {
      response = await UserPayees.findOneAndUpdate(
        { userId: requestedUser.userId },
        { $addToSet: { addedPayees: payeeId } },
        { new: true }
      );

      if (!response) {
        return res.status(404).json({ message: "User payee not found" });
      }
    }

    res.status(200).json({
      message: "User details fetched successfully",
      data: response,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user details", error });
  }
});

userPayeeRoutes.get("/", async (req: any, res: any) => {
  try {
    const requestedUser = req.user;
    const userPayeeData = await UserPayees.findOne({
      userId: requestedUser.userId,
    }).populate("addedPayees");

    if (!userPayeeData) {
      return res.status(404).json({ message: "User payee not found" });
    }
    const payeeDetails = await User.find({
      _id: { $in: userPayeeData.addedPayees },
    }).select("-password -otp -otpExpiresAt");


    res.status(200).json({
      message: "User payee details fetched successfully",
      data: payeeDetails,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user payee details", error });
  }
});

userPayeeRoutes.delete("/", async (req: any, res: any) => {
  try {
    const requestedUser = req.user;
    const payeeId = req.body.payeeId;
    const userPayeeData = await UserPayees.findOne({
      userId: requestedUser.userId,
    });
    if (!userPayeeData) {
      return res.status(404).json({ message: "User payee not found" });
    }
    const updatedUserPayeeData = await UserPayees.findOneAndUpdate(
      { userId: requestedUser.userId },
      { $pull: { addedPayees: payeeId } },
      { new: true }
    );
    if (!updatedUserPayeeData) {
      return res.status(404).json({ message: "User payee not found" });
    }
    res.status(200).json({
      message: "User payee deleted successfully",
      data: updatedUserPayeeData,
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user payee", error });
  }
});

userPayeeRoutes.get("/search-payee", async (req: any, res: any) => {
  try {
    const requestedUser = req.user;
    const { id } = req.query;

    if (!id) {
      return res
        .status(400)
        .json({ message: "Please provide an id to search" });
    }

    if (id === requestedUser.userId) {
      return res.status(400).json({ message: "Cannot search for yourself" });
    }

    const foundUser = await User.findOne({
      _id: id,
      userId: { $ne: requestedUser.userId },
    }).select("firstName lastName userName email _id imageUrl");

    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User retrieved successfully",
      data: foundUser,
    });
  } catch (error) {
    console.error("Error searching user:", error);
    return res.status(500).json({ message: "Error searching user", error });
  }
});


export default userPayeeRoutes;
