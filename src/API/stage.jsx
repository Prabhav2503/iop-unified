// Stage API functions
// Mirrors backend routes in initiative/stages.js

const BASE = `/api/stages`;

// POST /api/stages/:initiative_id
// Body: { name }
// Returns: { stage_id, data: InitiativeStageLink, message: string } | { error: string }
export const createStageForInitiative = async (initiative_id, name) => {
    if (!initiative_id) {
        return { error: "Initiative ID is required" };
    }
    if (!name) {
        return { error: "Stage name is required" };
    }

    try {
        const response = await fetch(`${BASE}/${initiative_id}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name })
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { stage_id: json.stage_id, data: json.data, message: json.message };
    } catch (err) {
        return { error: err.message || "Failed to create stage" };
    }
};

// GET /api/stages/by-initiative/:initiative_id
// Returns: { data: Stage[] } | { error: string }
export const getStagesByInitiative = async (initiative_id) => {
    if (!initiative_id) {
        return { error: "Initiative ID is required" };
    }

    try {
        const response = await fetch(`${BASE}/by-initiative/${initiative_id}`, {
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
        return { error: err.message || "Failed to fetch stages" };
    }
};

// DELETE /api/stages/:id
// Returns: { data: { id }, message: string } | { error: string }
export const deleteStage = async (id) => {
    if (!id) {
        return { error: "Stage ID is required" };
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

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data, message: json.message };
    } catch (err) {
        return { error: err.message || "Failed to delete stage" };
    }
};
