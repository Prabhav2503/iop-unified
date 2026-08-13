// Startup API functions
// Mirrors backend routes in startup/startuproutes.js

const BASE = `${import.meta.env.VITE_BACKEND_URL}/api/startups`;

// GET /api/startups/all
// Returns summary list: { id, name, sector, description, founder_id, created_at, stage, engagement }
// Returns: { data: StartupSummary[] } | { error: string }
export const getAllStartups = async () => {
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
        return { error: err.message || "Failed to fetch startups" };
    }
};

// GET /api/startups/:id
// Returns full startup record
// Returns: { data: Startup } | { error: string }
export const getStartupById = async (id) => {
    if (!id) {
        return { error: "Startup ID is required" };
    }

    try {
        const response = await fetch(`${BASE}/${id}`, {
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
        return { error: err.message || "Failed to fetch startup" };
    }
};

// POST /api/startups
// Body: { name, description, edc_impact, sector, stage, engagement, year, email, phone, website, linkedin, founder_id, initiative_id, support_type }
// Returns: { data: Startup } | { error: string }
export const createStartup = async ({
    name,
    description,
    edc_impact,
    sector,
    stage,
    engagement,
    year,
    email,
    phone,
    website,
    linkedin,
    founder_id,
    initiative_id,
    support_type,
}) => {
    if (!name) {
        return { error: "Startup name is required" };
    }

    try {
        const response = await fetch(`${BASE}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                description,
                edc_impact,
                sector,
                stage,
                engagement,
                year,
                email,
                phone,
                website,
                linkedin,
                founder_id,
                initiative_id,
                support_type,
            })
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to create startup" };
    }
};

// POST /api/startups/:id
// Links an update entry to a startup (appends update_id to startup's updates_id array)
// Body: { update_id }
// Returns: { data: Startup } | { error: string }
export const linkUpdateToStartup = async (id, update_id) => {
    if (!id) {
        return { error: "Startup ID is required" };
    }
    if (!update_id) {
        return { error: "Update ID is required" };
    }

    try {
        const response = await fetch(`${BASE}/${id}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ update_id })
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to link update to startup" };
    }
};

// PATCH /api/startups/:id
// Body (all optional): { name, description, edc_impact, sector, stage, engagement, year, email, phone, website, linkedin, founder_id, initiative_id, support_type }
// Returns: { data: Startup } | { error: string }
export const updateStartup = async (id, updates) => {
    if (!id) {
        return { error: "Startup ID is required" };
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
        return { error: err.message || "Failed to update startup" };
    }
};

// DELETE /api/startups/:id
// Returns: { data: { id } } | { error: string }
export const deleteStartup = async (id) => {
    if (!id) {
        return { error: "Startup ID is required" };
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

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to delete startup" };
    }
};
