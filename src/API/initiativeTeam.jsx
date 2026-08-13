// Initiative Team API functions
// Mirrors backend routes in initiative/initiative_teams.js

const BASE = `${import.meta.env.VITE_BACKEND_URL}/api/initiative-teams`;

// POST /api/initiative-teams/:initiative_id
// Body: team_ids (array of team_id UUIDs)
// Returns: { data: InitiativeTeamLink[], message: string } | { error: string }
export const assignTeamsToInitiative = async (initiative_id, team_ids) => {
    if (!initiative_id) {
        return { error: "Initiative ID is required" };
    }
    if (!Array.isArray(team_ids) || team_ids.length === 0) {
        return { error: "At least one team ID is required" };
    }

    try {
        const response = await fetch(`${BASE}/${initiative_id}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(team_ids)
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data, message: json.message };
    } catch (err) {
        return { error: err.message || "Failed to assign teams to initiative" };
    }
};

// GET /api/initiative-teams/:initiative_id
// Returns: { data: team_id[] } | { error: string }
export const getInitiativeTeamIds = async (initiative_id) => {
    if (!initiative_id) {
        return { error: "Initiative ID is required" };
    }

    try {
        const response = await fetch(`${BASE}/${initiative_id}`, {
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
        return { error: err.message || "Failed to fetch initiative teams" };
    }
};

// DELETE /api/initiative-teams/:initiative_id
// Body: team_ids (array of team_id UUIDs)
// Returns: { data: InitiativeTeamLink[], message: string } | { error: string }
export const removeTeamsFromInitiative = async (initiative_id, team_ids) => {
    if (!initiative_id) {
        return { error: "Initiative ID is required" };
    }
    if (!Array.isArray(team_ids) || team_ids.length === 0) {
        return { error: "At least one team ID is required" };
    }

    try {
        const response = await fetch(`${BASE}/${initiative_id}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(team_ids)
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data, message: json.message };
    } catch (err) {
        return { error: err.message || "Failed to remove teams from initiative" };
    }
};
