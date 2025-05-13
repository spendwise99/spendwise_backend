import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  imageUrl: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  password: string;
  balance: 0;
  role: "user" | "admin";
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    userName: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    phoneNumber: { type: String },
    imageUrl: { type: String },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    password: { type: String },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);
const User = mongoose.model<IUser>("User", UserSchema);

export default User;
