import express from "express";
import crypto from "crypto";
import middleware from "../middleware/authcontext.js";
import supabase from "../utility/supabase.js";
import {
  teamCreateValidator,
  teamUpdateValidator,
} from "../validator/teams.js";
import {handleValidationErrors} from "../utility/helper.js";
import {requirePrivilegedRole} from "../utility/helper.js";
import { getUserRoles } from "../utility/helper.js";

const router = express.Router();

const privilegedRoles = ["admin", "overall_coordinator", "co_overall_coordinator", "coordinator"];

router.post("/register", teamCreateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) {
    return;
  }

  if (!requirePrivilegedRole(req, res, privilegedRoles)) {
    return;
  }

  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];

    const { data, error } = await supabase
      .from("Team")
      .insert(payload)
      .select("id,created_at,name,role,email,number,initiative,tasks,contribution,vertical");

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    const createdMembers = Array.isArray(data) ? data : [data];

    // Create MD5 hash for default password "1234567890"
    const defaultPasswordHash = crypto
      .createHash("md5")
      .update("1234567890")
      .digest("hex");

    // Prepare entries for DummyAuth table
    const authEntries = createdMembers.map((member) => ({
      profile_id: member.id,
      username: member.name,
      hashed_password: defaultPasswordHash,
      role: member.role,
    }));

    const { error: authError } = await supabase
      .from("DummyAuth")
      .insert(authEntries);

    if (authError) {
      console.error("Error inserting into DummyAuth:", authError);
      return res.status(207).json({
        message: "Team member(s) created, but failed to create auth credentials",
        data: createdMembers,
        authError: authError.message,
      });
    }

    return res.status(201).json({
      message: "Team member(s) created and registered in DummyAuth successfully",
      data: createdMembers,
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Team")
      .select("id,name,role,email,vertical")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/dropdown/all", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Team")
      .select("id,name,role")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

// GET /api/teams/:id/activity
// Returns all initiatives and tasks linked to this team member via junction tables.
router.get("/:id/activity", async (req, res) => {
  try {
    const teamId = req.params.id;

    const [initiativesResult, tasksResult] = await Promise.all([
      // initiatives via initiative_team join
      supabase
        .from("initiative_team")
        .select(`
          initiative_id,
          initiatives (
            id,
            name,
            description,
            status,
            deadline,
            impact
          )
        `)
        .eq("team_id", teamId),

      // tasks via task_assignees join
      supabase
        .from("task_assignees")
        .select(`
          task_id,
          tasks (
            id,
            title,
            status,
            priority,
            deadline
          )
        `)
        .eq("team_id", teamId),
    ]);

    if (initiativesResult.error) {
      return res.status(400).json({ message: initiativesResult.error.message, error: initiativesResult.error });
    }
    if (tasksResult.error) {
      return res.status(400).json({ message: tasksResult.error.message, error: tasksResult.error });
    }

    const initiatives = (initiativesResult.data || [])
      .map((row) => row.initiatives)
      .filter(Boolean);

    const tasks = (tasksResult.data || [])
      .map((row) => row.tasks)
      .filter(Boolean);

    return res.status(200).json({ data: { initiatives, tasks } });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  if (handleValidationErrors(req, res)) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from("Team")
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

router.patch("/:id", teamUpdateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from("Team")
      .update(req.body)
      .eq("id", req.params.id)
      .select("id,created_at,name,role,email,number,initiative,tasks,contribution,vertical")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: error.message, error });
    }

    return res.status(200).json({ message: "Team member updated successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  if (handleValidationErrors(req, res)) {
    return;
  }

  if (!requirePrivilegedRole(req, res, privilegedRoles)) {
    return;
  }

  try {
    const { data, error } = await supabase.from("Team").delete().eq("id", req.params.id).select("id").single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: error.message, error });
    }

    return res.status(200).json({ message: "Team member deleted successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

export default router;



// Teams Table Schema 
/* 

create table public."Team" (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  role role[] not null,
  email text not null,
  number text not null,
  initiative text[] null,
  tasks text[] null,
  contribution text[] null,
  vertical public.vertical not null,
  constraint team_pkey primary key (id)
) TABLESPACE pg_default;

*/