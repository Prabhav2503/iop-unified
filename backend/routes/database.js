import express from "express";
import supabase from "../utility/supabase.js";
import { handleValidationErrors, requirePrivilegedRole } from "../utility/helper.js";
import {
  databaseCreateValidator,
  databaseUpdateValidator,
  databaseIdValidator,
} from "../validator/database.js";

const router = express.Router();
const privilegedRoles = ["admin", "overall_coordinator", "co_overall_coordinator", "coordinator"];

router.post("/", databaseCreateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  if (!requirePrivilegedRole(req, res, privilegedRoles)) return;

  try {
    const payload = {
      drive_url: req.body.drive_url,
      name: req.body.name,
      description: req.body.description,
      created_by: req.body.created_by ?? req.user.userid ?? req.user.id,
    };

    const { data, error } = await supabase
      .from("Database")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(201).json({ message: "Database record created successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Database")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/:id", databaseIdValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { data, error } = await supabase
      .from("Database")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: error.message, error });
    }

    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.patch("/:id", databaseIdValidator, databaseUpdateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  if (!requirePrivilegedRole(req, res, privilegedRoles)) return;

  try {
    const payload = {};
    if (req.body.drive_url !== undefined) payload.drive_url = req.body.drive_url;
    if (req.body.name !== undefined) payload.name = req.body.name;
    if (req.body.description !== undefined) payload.description = req.body.description;
    if (req.body.created_by !== undefined) payload.created_by = req.body.created_by;

    const { data, error } = await supabase
      .from("Database")
      .update(payload)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: error.message, error });
    }

    return res.status(200).json({ message: "Database record updated successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.delete("/:id", databaseIdValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  if (!requirePrivilegedRole(req, res, privilegedRoles)) return;

  try {
    const { data, error } = await supabase
      .from("Database")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: error.message, error });
    }

    return res.status(200).json({ message: "Database record deleted successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

export default router;
