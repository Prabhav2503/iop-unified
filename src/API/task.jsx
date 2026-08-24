// Task API functions
// Mirrors backend routes in tasks.js

const BASE = `/api/tasks`;

export const getTaskAssigneeIds = (taskOrAssignees) => {
    if (taskOrAssignees == null || taskOrAssignees === '') return [];

    const fromValue = (value) => {
        if (value == null || value === '') return [];
        const list = Array.isArray(value) ? value : [value];
        const ids = [];
        const seen = new Set();

        for (const item of list) {
            const raw =
                item && typeof item === 'object'
                    ? item.team_id || item.id || item.profile_id
                    : item;
            const id = String(raw ?? '').trim();
            if (!id || id === 'undefined' || id === 'null') continue;
            const key = id.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            ids.push(id);
        }

        return ids;
    };

    if (Array.isArray(taskOrAssignees) || typeof taskOrAssignees !== 'object') {
        return fromValue(taskOrAssignees);
    }

    const direct = taskOrAssignees.assignees;
    if (Array.isArray(direct)) {
        const looksLikeIds =
            direct.length === 0 ||
            typeof direct[0] !== 'object' ||
            direct[0] == null;
        if (looksLikeIds) return fromValue(direct);
    } else if (typeof direct === 'string' && direct) {
        return fromValue(direct);
    }

    if (Array.isArray(taskOrAssignees.task_assignees)) {
        return fromValue(taskOrAssignees.task_assignees);
    }

    return fromValue(direct);
};

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

