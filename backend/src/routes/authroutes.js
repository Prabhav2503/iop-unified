import express from "express";
import { validationResult } from "express-validator";
import supabase from "../utility/supabase.js";
import { loginClientValidator, changePasswordValidator } from "../validator/auth.js";
import dotenv from "dotenv";
import { tokengenerator, verifytoken } from "../utility/helper.js";
dotenv.config();

const router = express.Router();

router.post("/login", loginClientValidator, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  console.log("Received login request:", { username, password });
  try {
    const { data, error } = await supabase
      .from("DummyAuth")
      .select("profile_id,username,role,hashed_password")
      .eq("username", username)
      .single();

    console.log(data);
    if (error) {
      return res.status(404).json({ error: error, message: "User not found" });
    }

    if (data.hashed_password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const role = Array.isArray(data.role)
      ? data.role
      : typeof data.role === "string"
        ? data.role.split(",").map((item) => item.trim()).filter(Boolean)
        : [];

    const token = await tokengenerator({
      id: data.profile_id,
      userid: data.profile_id,
      profile_id: data.profile_id,
      username: data.username,
      role,
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
      path:"/"
    });

    return res.status(200).json({
      message: "Login successful",
      data: {
        id: data.profile_id,
        userid: data.profile_id,
        profile_id: data.profile_id,
        username: data.username,
        role,
        token: token,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:"lax",
    path: "/",
  });

  return res.status(200).json({
    message: "Logout successful",
  });
});


router.get("/me", async (req, res) => {
  const token = req.cookies.token ? req.cookies.token : req.headers['token'];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = await verifytoken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
    return res.status(200).json({ data: decoded });
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: Invalid token", error: err.message });
  }
});

router.put("/update-password",changePasswordValidator,  async (req, res) => {
  const current = req.body.currentPassword;  
  const newPassword = req.body.newPassword;
  const profile_id = req.body.profile_id;

  if (!current || !newPassword || !profile_id) {
    return res.status(400).json({
      message: "Missing required parameters: current, new, and id (profile_id)",
    });
  }

  try {
    const { data, error } = await supabase
      .from("DummyAuth")
      .select("profile_id, hashed_password")
      .eq("profile_id", profile_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: error, message: "User not found" });
    }

    if (data.hashed_password !== current) {
      return res.status(400).json({ message: "Current password does not match" });
    }

    const { error: updateError } = await supabase
      .from("DummyAuth")
      .update({ hashed_password: newPassword })
      .eq("profile_id", profile_id);

    if (updateError) {
      return res.status(400).json({ error: updateError, message: "Failed to update password" });
    }

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
