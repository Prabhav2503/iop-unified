import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { validationResult } from "express-validator";

dotenv.config();

export const tokengenerator = (payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
  return token;
};

export const verifytoken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    throw new Error({msg:"Invalid token", error:err});
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