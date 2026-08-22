import express from "express";
import supabase from "../../utility/supabase.js";
import { handleValidationErrors } from "../../utility/helper.js";
import { taskCreateValidator, taskUpdateValidator, stageIdValidator } from "../../validator/initiative.js";
import { mapTaskPayload, mapTaskUpdatePayload } from "../../utility/payload_manager.js";

const router = express.Router();

router.post("/", taskCreateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const payload = mapTaskPayload(req.body);
    const assignees = req.body.assignees;
    const stage_id = req.body.stage_id;

    // 1. Create Task
    console.log("Creating task with payload:", payload);
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .insert([payload])
      .select("id")
      .single();

    if (taskError) {
      return res.status(400).json({ message: taskError.message, error: taskError });
    }

    const task_id = taskData.id;

    // 2. Link assignees
    const assigneePayload = assignees.map(team_id => ({ task_id, team_id }));
    const { data: linkData, error: linkError } = await supabase
      .from("task_assignees")
      .insert(assigneePayload)
      .select("*");

    if (linkError) {
      await supabase.from("tasks").delete().eq("id", task_id);
      return res.status(400).json({ message: linkError.message, error: linkError });
    }

    // 3. Link task to stage if provided
    let stageLinkData = null;
    if (stage_id) {
      const { data: stageLink, error: stageLinkError } = await supabase
        .from("stage_tasks")
        .insert([{ stage_id, task_id }])
        .select("*")
        .single();

      if (stageLinkError) {
        await supabase.from("task_assignees").delete().eq("task_id", task_id);
        await supabase.from("tasks").delete().eq("id", task_id);
        return res.status(400).json({ message: stageLinkError.message, error: stageLinkError });
      }

      stageLinkData = stageLink;
    }

    return res.status(201).json({
      message: "Task created and assignees added",
      task_id,
      data: {
        assignees: linkData,
        stage_task: stageLinkData,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        task_assignees (
          team_id
        ),
        stage_tasks (
          stage_id
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/by-stage/:id", stageIdValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { data: links, error: linkError } = await supabase
      .from("stage_tasks")
      .select("task_id")
      .eq("stage_id", req.params.id);

    if (linkError) {
      return res.status(400).json({ message: linkError.message, error: linkError });
    }

    if (!links || links.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const taskIds = links.map(link => link.task_id);
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        task_assignees (
          team_id
        ),
        stage_tasks (
          stage_id
        )
      `)
      .in("id", taskIds)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.patch("/:id", taskUpdateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    // Check owner
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("creator_id")
      .eq("id", req.params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: fetchError.message, error: fetchError });
    }

    const userId = String(req.user?.profile_id || req.user?.id || req.user?.userid || '').toLowerCase().trim();
    const creatorId = String(task.creator_id || '').toLowerCase().trim();

    if (!userId || creatorId !== userId) {
      return res.status(403).json({ message: "your are not its owner" });
    }

    const payload = mapTaskUpdatePayload(req.body);
    const stage_id = req.body.stage_id;

    if (stage_id !== undefined) {
      const { error: deleteStageLinkError } = await supabase
        .from("stage_tasks")
        .delete()
        .eq("task_id", req.params.id);

      if (deleteStageLinkError) {
        return res.status(400).json({ message: deleteStageLinkError.message, error: deleteStageLinkError });
      }

      if (stage_id) {
        const { error: stageLinkError } = await supabase
          .from("stage_tasks")
          .insert([{ stage_id, task_id: req.params.id }]);

        if (stageLinkError) {
          return res.status(400).json({ message: stageLinkError.message, error: stageLinkError });
        }
      }
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(200).json({ message: "Task updated successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    // Check owner
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("creator_id")
      .eq("id", req.params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: fetchError.message, error: fetchError });
    }

    const userId = String(req.user?.profile_id || req.user?.id || req.user?.userid || '').toLowerCase().trim();
    const creatorId = String(task.creator_id || '').toLowerCase().trim();

    if (!userId || creatorId !== userId) {
      return res.status(403).json({ message: "your are not its owner" });
    }

    const { error: deleteStageTasksError } = await supabase
      .from("stage_tasks")
      .delete()
      .eq("task_id", req.params.id);

    if (deleteStageTasksError) {
      return res.status(400).json({ message: deleteStageTasksError.message, error: deleteStageTasksError });
    }

    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .single();

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(200).json({ message: "Task deleted successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

export default router;
