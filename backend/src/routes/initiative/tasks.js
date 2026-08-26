import express from "express";
import supabase from "../../utility/supabase.js";
import { handleValidationErrors } from "../../utility/helper.js";
import { taskCreateValidator, taskUpdateValidator, stageIdValidator } from "../../validator/initiative.js";
import { mapTaskPayload, mapTaskUpdatePayload, normalizeAssigneeIds, shapeTask } from "../../utility/payload_manager.js";

const router = express.Router();

const TASK_SELECT = `
  *,
  task_assignees (
    team_id
  ),
  stage_tasks (
    stage_id
  )
`;

async function fetchShapedTask(taskId) {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", taskId)
    .single();

  if (error) return { error };
  return { data: shapeTask(data) };
}

async function syncTaskAssignees(taskId, nextIds) {
  const { data: existing, error: existingError } = await supabase
    .from("task_assignees")
    .select("team_id")
    .eq("task_id", taskId);

  if (existingError) return existingError;

  const currentByKey = new Map();
  for (const row of existing || []) {
    if (!row?.team_id) continue;
    currentByKey.set(String(row.team_id).toLowerCase(), row.team_id);
  }

  const nextByKey = new Map();
  for (const id of nextIds) {
    const key = String(id).toLowerCase();
    if (!key) continue;
    nextByKey.set(key, id);
  }

  const toAdd = [...nextByKey.entries()]
    .filter(([key]) => !currentByKey.has(key))
    .map(([, team_id]) => ({ task_id: taskId, team_id }));

  const toRemove = [...currentByKey.entries()]
    .filter(([key]) => !nextByKey.has(key))
    .map(([, team_id]) => team_id);

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId)
      .in("team_id", toRemove);

    if (error) return error;
  }

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("task_assignees")
      .insert(toAdd);

    if (error) return error;
  }

  return null;
}

router.post("/", taskCreateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const payload = mapTaskPayload(req.body);
    const assignees = normalizeAssigneeIds(req.body.assignees);
    const stage_id = req.body.stage_id;

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .insert([payload])
      .select("id")
      .single();

    if (taskError) {
      return res.status(400).json({ message: taskError.message, error: taskError });
    }

    const task_id = taskData.id;

    if (assignees.length > 0) {
      const assigneePayload = assignees.map((team_id) => ({ task_id, team_id }));
      const { error: linkError } = await supabase
        .from("task_assignees")
        .insert(assigneePayload);

      if (linkError) {
        await supabase.from("tasks").delete().eq("id", task_id);
        return res.status(400).json({ message: linkError.message, error: linkError });
      }
    }

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

    const { data: createdTask, error: fetchCreatedError } = await fetchShapedTask(task_id);
    if (fetchCreatedError) {
      return res.status(201).json({
        message: "Task created and assignees added",
        task_id,
        data: {
          assignees,
          stage_task: stageLinkData,
        },
      });
    }

    return res.status(201).json({
      message: "Task created and assignees added",
      task_id,
      data: createdTask,
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(200).json({ data: (data || []).map(shapeTask) });
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

    const taskIds = links.map((link) => link.task_id);
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .in("id", taskIds)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message, error });
    }

    return res.status(200).json({ data: (data || []).map(shapeTask) });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.patch("/:id", taskUpdateValidator, async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("creator_id")
      .eq("id", req.params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: fetchError.message, error: fetchError });
    }

    const userId = String(req.user?.profile_id || req.user?.id || req.user?.userid || "").toLowerCase().trim();
    const creatorId = String(task.creator_id || "").toLowerCase().trim();

    if (!userId || creatorId !== userId) {
      return res.status(403).json({ message: "your are not its owner" });
    }

    const payload = mapTaskUpdatePayload(req.body);
    const stage_id = req.body.stage_id;
    const taskId = req.params.id;

    if (stage_id !== undefined) {
      const { error: deleteStageLinkError } = await supabase
        .from("stage_tasks")
        .delete()
        .eq("task_id", taskId);

      if (deleteStageLinkError) {
        return res.status(400).json({ message: deleteStageLinkError.message, error: deleteStageLinkError });
      }

      if (stage_id) {
        const { error: stageLinkError } = await supabase
          .from("stage_tasks")
          .insert([{ stage_id, task_id: taskId }]);

        if (stageLinkError) {
          return res.status(400).json({ message: stageLinkError.message, error: stageLinkError });
        }
      }
    }

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", taskId);

      if (error) {
        return res.status(400).json({ message: error.message, error });
      }
    }

    if (Array.isArray(req.body.assignees)) {
      const nextAssignees = normalizeAssigneeIds(req.body.assignees);
      const assigneeError = await syncTaskAssignees(taskId, nextAssignees);
      if (assigneeError) {
        return res.status(400).json({ message: assigneeError.message, error: assigneeError });
      }
    }

    const { data, error: shapedError } = await fetchShapedTask(taskId);
    if (shapedError) {
      return res.status(400).json({ message: shapedError.message, error: shapedError });
    }

    return res.status(200).json({ message: "Task updated successfully", data });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("creator_id")
      .eq("id", req.params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 400;
      return res.status(status).json({ message: fetchError.message, error: fetchError });
    }

    const userId = String(req.user?.profile_id || req.user?.id || req.user?.userid || "").toLowerCase().trim();
    const creatorId = String(task.creator_id || "").toLowerCase().trim();

    if (!userId || creatorId !== userId) {
      return res.status(403).json({ message: "your are not its owner" });
    }

    const { error: deleteAssigneesError } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", req.params.id);

    if (deleteAssigneesError) {
      return res.status(400).json({ message: deleteAssigneesError.message, error: deleteAssigneesError });
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
