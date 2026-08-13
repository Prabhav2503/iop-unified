import express from "express";
import supabase from "../../utility/supabase.js";
import { handleValidationErrors } from "../../utility/helper.js";
import { initiativeTeamValidator } from "../../validator/initiative.js";

const router = express.Router();

router.post("/:id", initiativeTeamValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const initiative_id = req.params.id;
    const team_ids = req.body;

    const payload = team_ids.map(team_id => ({ initiative_id, team_id }));

    const { data, error } = await supabase
      .from("initiative_team")
      .insert(payload)
      .select("*");

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(201).json({ message: "Teams assigned successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("initiative_team")
      .select("team_id")
      .eq("initiative_id", req.params.id);

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    const teamIds = data.map(item => item.team_id);
    return res.status(200).json({ data: teamIds });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.delete("/:id", initiativeTeamValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const initiative_id = req.params.id;
    const team_ids = req.body;

    const { data, error } = await supabase
      .from("initiative_team")
      .delete()
      .eq("initiative_id", initiative_id)
      .in("team_id", team_ids)
      .select("*");

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(200).json({ message: "Teams removed successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

export default router;
