import Joi from "joi";

export const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  userName: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phoneNumber: Joi.string().required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const setPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "string.empty": "Password cannot be empty",
    "any.required": "Password is required",
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const requestNewOtpSchema = Joi.object({
  type: Joi.string().valid("EMAIL", "MOBILE").required(),
  email: Joi.string().email().when("type", {
    is: "EMAIL",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  phone: Joi.string().when("type", {
    is: "MOBILE",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string()
    .email()
    .when("type", {
      is: "EMAIL",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
  phone: Joi.string().when("type", {
    is: "MOBILE",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  otp: Joi.string().length(6).required(),
  type: Joi.string().valid("EMAIL", "MOBILE").required(),
});
