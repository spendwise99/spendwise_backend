import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Secret keys (make sure to store them securely)
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET || 'your-access-token-secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_TOKEN_SECRET || 'your-refresh-token-secret';

// Function to generate an access token
export const generateAccessToken = (user: any) => {
  // The second argument is the secret key, and the third argument is the options object
  return jwt.sign(
    {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userId: user._id,
      phoneNumber: user.phoneNumber,
      age: user.age,
      isVerified: user.isVerified,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1d' } // expires in 15 minutes
  );
};

// Function to generate a refresh token
export const generateRefreshToken = (user: any) => {
  return jwt.sign(
    {
      email: user.email,
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' } // expires in 7 days
  );
};

// Function to verify access token
export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

// Function to verify refresh token
export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};
