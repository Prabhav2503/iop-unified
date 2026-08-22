import express from "express";
import supabase from "../../utility/supabase.js";
import { handleValidationErrors, requirePrivilegedRole } from "../../utility/helper.js";
import { initiativeCreateValidator, initiativeIdValidator, initiativeUpdateValidator } from "../../validator/initiative.js";
import { mapInitiativePayload } from "../../utility/payload_manager.js";

const router = express.Router();
const privilegedRoles = ["admin", "overall_coordinator", "co_overall_coordinator", "coordinator"];

router.post("/", initiativeCreateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  if (!requirePrivilegedRole(req, res, privilegedRoles)) return;

  try {
    const payload = mapInitiativePayload(req.body, req.user.profile_id);
    const { data, error } = await supabase
      .from("initiatives")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(201).json({ message: "Initiative created successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  if (!requirePrivilegedRole(req, res, privilegedRoles)) return;

  try {
    const { data, error } = await supabase
      .from("initiatives")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: error.message, error });
    }

    return res.status(200).json({ message: "Initiative deleted successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("initiatives")
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

router.get("/:id", initiativeIdValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { data, error } = await supabase
      .from("initiatives")
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

router.patch("/:id", initiativeIdValidator, initiativeUpdateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  if (!requirePrivilegedRole(req, res, privilegedRoles)) return;

  try {
    const payload = {};
    if (req.body.name !== undefined) payload.name = req.body.name;
    if (req.body.description !== undefined) payload.description = req.body.description;
    if (req.body.impact !== undefined) payload.impact = req.body.impact;
    if (req.body.deadline !== undefined) payload.deadline = req.body.deadline;
    if (req.body.status !== undefined) payload.status = req.body.status;
    if (req.body.whatsapp_link !== undefined) payload.whatsapp_link = req.body.whatsapp_link;

    const { data, error } = await supabase
      .from("initiatives")
      .update(payload)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: error.message, error });
    }

    return res.status(200).json({ message: "Initiative updated successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

export default router;
