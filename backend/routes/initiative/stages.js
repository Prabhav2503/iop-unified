import express from "express";
import supabase from "../../utility/supabase.js";
import { handleValidationErrors } from "../../utility/helper.js";
import { stageCreateValidator } from "../../validator/initiative.js";

const router = express.Router();

router.post("/:id", stageCreateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const initiative_id = req.params.id;
    const { name } = req.body;

    // 1. Create Stage
    const { data: stageData, error: stageError } = await supabase
      .from("stages")
      .insert([{ name }])
      .select("id")
      .single();

    if (stageError) {
      return res.status(400).json({ message: stageError.message, error: stageError });
    }

    const stage_id = stageData.id;

    // 2. Link stage to initiative
    const { data: linkData, error: linkError } = await supabase
      .from("initiative_stages")
      .insert([{ initiative_id, stage_id }])
      .select("*")
      .single();

    if (linkError) {
      // Rollback stage creation if linking fails
      await supabase.from("stages").delete().eq("id", stage_id);
      return res.status(400).json({ message: linkError.message, error: linkError });
    }

    return res.status(201).json({ message: "Stage created and linked successfully", stage_id, data: linkData });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { error: deleteStageTasksError } = await supabase
      .from("stage_tasks")
      .delete()
      .eq("stage_id", req.params.id);

    if (deleteStageTasksError) {
      return res.status(400).json({ message: deleteStageTasksError.message, error: deleteStageTasksError });
    }

    const { data, error } = await supabase
      .from("stages")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: error.message, error });
    }

    return res.status(200).json({ message: "Stage deleted successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/by-initiative/:initiative_id", async (req, res) => {
  try {
    const { data: links, error: linkError } = await supabase
      .from("initiative_stages")
      .select("stage_id")
      .eq("initiative_id", req.params.initiative_id);

    if (linkError) {
      return res.status(400).json({ message: linkError.message, error: linkError });
    }

    if (!links || links.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const stageIds = links.map(l => l.stage_id);
    const { data: stages, error: stagesError } = await supabase
      .from("stages")
      .select("*")
      .in("id", stageIds);

    if (stagesError) {
      return res.status(400).json({ message: stagesError.message, error: stagesError });
    }

    return res.status(200).json({ data: stages });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

export default router;
