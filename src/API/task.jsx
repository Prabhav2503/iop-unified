// Task API functions
// Mirrors backend routes in tasks.js

const BASE = `/api/tasks`;

// GET /api/tasks/all
// Returns: { data: Task[] } | { error: string }
export const getAllTasks = async () => {
    try {
        const response = await fetch(`${BASE}/all`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to fetch tasks" };
    }
};

// POST /api/tasks
// Body: { title, description, deadline, priority, status, initiative_id, stage_id, creator_id, assignees: team_id[] }
// Returns: { data, task_id } | { error: string }
export const createTask = async (taskPayload) => {
    console.log("frontend api call",taskPayload)
    try {
        const response = await fetch(`${BASE}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(taskPayload)
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data, task_id: json.task_id };
    } catch (err) {
        return { error: err.message || "Failed to create task" };
    }
};

// PATCH /api/tasks/:id
// Body: updates object
// Returns: { data: Task } | { error: string }
export const updateTask = async (id, updates) => {
    if (!id) {
        return { error: "Task ID is required" };
    }

    try {
        const response = await fetch(`${BASE}/${id}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updates)
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to update task" };
    }
};

// DELETE /api/tasks/:id
// Returns: { data: { id } } | { error: string }
export const deleteTask = async (id) => {
    if (!id) {
        return { error: "Task ID is required" };
    }

    try {
        const response = await fetch(`${BASE}/${id}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json = await response.json().catch(() => null);

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to delete task" };
    }
};

// GET /api/tasks/by-stage/:id
// Returns: { data: Task[] } | { error: string }
export const getTasksByStage = async (stageId) => {
    if (!stageId) {
        return { error: "Stage ID is required" };
    }

    try {
        const response = await fetch(`${BASE}/by-stage/${stageId}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to fetch tasks by stage" };
    }
};

