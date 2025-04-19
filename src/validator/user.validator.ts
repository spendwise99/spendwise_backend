import Joi from "joi";

export const userUpdateSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phoneNumber: Joi.string().required(),
  userName: Joi.string().required(),
  age: Joi.number().integer().min(0).required(),
});
