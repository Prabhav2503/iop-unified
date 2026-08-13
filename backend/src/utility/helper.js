import { SignJWT, jwtVerify } from "jose";
import dotenv from "dotenv";
import { validationResult } from "express-validator";

dotenv.config();

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET);

export const tokengenerator = async (payload) => {
  const secret = getSecret();
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d")
    .sign(secret);
  return token;
};

export const verifytoken = async (token) => {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    throw new Error("Invalid token: " + err.message);
  }
};


export const getUserRoles = (user) => {
  const rawRoles = user?.role ?? user?.roles ?? [];

  if (Array.isArray(rawRoles)) {
    return rawRoles;
  }

  if (typeof rawRoles === "string") {
    return rawRoles
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);
  }

  return [];
};


export const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }

  return false;
};


export const requirePrivilegedRole = (req, res, privilegedRoles) => {
	const userRoles = getUserRoles(req.user);
	const isAllowed = userRoles.some((role) => privilegedRoles.includes(role));

	if (!isAllowed) {
		res.status(403).json({ message: "You are not authorised to do that" });
		return false;
	}

	return true;
};