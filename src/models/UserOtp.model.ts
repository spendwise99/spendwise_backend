import mongoose, { Document, Schema } from "mongoose";

export interface UserOtp extends Document {
  email: string;
  phone: string;
  mobileOtp: string;
  emailOtp: string;
  mobileOtpExpire: Date;
  emailOtpExpire: Date;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
}

const UserOtpSchema: Schema = new Schema(
  {
    email: { type: String, required: false, default: null },
    phone: { type: String, required: false, default: null },
    mobileOtp: { type: String, required: false, default: null },
    emailOtp: { type: String, required: false, default: null },
    mobileOtpExpire: { type: Date, required: false, default: null },
    emailOtpExpire: { type: Date, required: false, default: null },
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const UserOtp = mongoose.model<UserOtp>("UserOtp", UserOtpSchema);

export default UserOtp;
