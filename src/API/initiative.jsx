// Initiative API functions
// Mirrors backend routes in initiatives.js

const BASE = `${import.meta.env.VITE_BACKEND_URL}/api/initiatives`;

// GET /api/initiatives/all
// Returns: { data: Initiative[] } | { error: string }
export const getAllInitiatives = async () => {
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
        return { error: err.message || "Failed to fetch initiatives" };
    }
};

// GET /api/initiatives/all  →  filtered to status === 'active'
// Returns only { id, name } for each active initiative
// Returns: { data: { id, name }[] } | { error: string }
export const getActiveInitiatives = async () => {
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

        const active = (json.data || [])
            .filter((i) => i.status === "active" || i.status === "planning")
            .map(({ id, name }) => ({ id, name }));

        return { data: active };
    } catch (err) {
        return { error: err.message || "Failed to fetch active initiatives" };
    }
};


// GET /api/initiatives/:id
// Returns: { data: Initiative } | { error: string }
export const getInitiativeById = async (id) => {
    if (!id) {
        return { error: "Initiative ID is required" };
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
        return { error: err.message || "Failed to fetch initiative" };
    }
};

// POST /api/initiatives
// Body: { name, description, impact, deadline, status }
// Returns: { data: Initiative } | { error: string }
export const createInitiative = async ({ name, description, impact, deadline, status, creator_id }) => {
    
    if (!name) {
        return { error: "Initiative name is required" };
    }

    try {
        const response = await fetch(`${BASE}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, description, impact, deadline, status, created_by:creator_id })
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to create initiative" };
    }
};

// PATCH /api/initiatives/:id
// Body (all optional): { name, description, impact, deadline, status }
// Returns: { data: Initiative } | { error: string }
export const updateInitiative = async (id, updates) => {
    if (!id) {
        return { error: "Initiative ID is required" };
    }

    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.impact !== undefined) payload.impact = updates.impact;
    if (updates.deadline !== undefined) payload.deadline = updates.deadline;
    if (updates.status !== undefined) payload.status = updates.status;

    try {
        const response = await fetch(`${BASE}/${id}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to update initiative" };
    }
};

// DELETE /api/initiatives/:id
// Returns: { data: { id } } | { error: string }
export const deleteInitiative = async (id) => {
    if (!id) {
        return { error: "Initiative ID is required" };
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
        return { error: err.message || "Failed to delete initiative" };
    }
};
