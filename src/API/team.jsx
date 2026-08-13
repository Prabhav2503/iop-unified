// Team API functions
// Mirrors backend routes in teamroutes.js

const BASE = `${import.meta.env.VITE_BACKEND_URL}/api/teams`;

// GET /api/teams/all
// Returns summary list: { id, name, role, email, vertical }
// Returns: { data: TeamMember[] } | { error: string }
export const getAllTeamMembers = async () => {
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
        return { error: err.message || "Failed to fetch team members" };
    }
};

// GET /api/teams/dropdown/all
// Returns minimal list for dropdowns: { id, name, role }
// Returns: { data: TeamDropdownItem[] } | { error: string }
export const getTeamDropdown = async () => {
    try {
        const response = await fetch(`${BASE}/dropdown/all`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json = await response.json().catch(() => null);

        if (!response.ok || !json?.data) {
            // Fallback to /api/teams/all
            return await getAllTeamMembers();
        }

        return { data: json.data };
    } catch {
        return await getAllTeamMembers();
    }
};

// GET /api/teams/:id
// Returns full team member record
// Returns: { data: TeamMember } | { error: string }
export const getTeamMemberById = async (id) => {
    if (!id) {
        return { error: "Team member ID is required" };
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
        return { error: err.message || "Failed to fetch team member" };
    }
};

// POST /api/teams/register
// Body: { name, role, email, number, initiative, tasks, contribution, vertical }
// Returns: { data: TeamMember } | { error: string }
export const registerTeamMember = async ({ name, role, email, number, initiative, tasks, contribution, vertical }) => {
    if (!name) {
        return { error: "Name is required" };
    }

    try {
        const payload = {
            name,
            role: Array.isArray(role) ? role : (role ? [role] : []),
            email,
            number,
            initiative: Array.isArray(initiative) ? initiative : (initiative ? [initiative] : []),
            tasks: Array.isArray(tasks) ? tasks : (tasks ? [tasks] : []),
            contribution: Array.isArray(contribution) ? contribution : (contribution ? [contribution] : []),
            vertical,
        };

        const response = await fetch(`${BASE}/register`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            if (json?.errors && Array.isArray(json.errors) && json.errors.length > 0) {
                const errMsg = json.errors.map(e => e.msg || e.message).join(', ');
                throw new Error(errMsg);
            }
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to register team member" };
    }
};

// PATCH /api/teams/:id
// Body (all optional): { name, role, email, number, initiative, tasks, contribution, vertical }
// Returns: { data: TeamMember } | { error: string }
export const updateTeamMember = async (id, updates) => {
    if (!id) {
        return { error: "Team member ID is required" };
    }

    try {
        const payload = { ...updates };
        if ('initiative' in payload) {
            payload.initiative = Array.isArray(payload.initiative) ? payload.initiative : (payload.initiative ? [payload.initiative] : []);
        }
        if ('tasks' in payload) {
            payload.tasks = Array.isArray(payload.tasks) ? payload.tasks : (payload.tasks ? [payload.tasks] : []);
        }
        if ('contribution' in payload) {
            payload.contribution = Array.isArray(payload.contribution) ? payload.contribution : (payload.contribution ? [payload.contribution] : []);
        }
        if ('role' in payload && !Array.isArray(payload.role)) {
            payload.role = payload.role ? [payload.role] : [];
        }

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
            if (json?.errors && Array.isArray(json.errors) && json.errors.length > 0) {
                const errMsg = json.errors.map(e => e.msg || e.message).join(', ');
                throw new Error(errMsg);
            }
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to update team member" };
    }
};

// DELETE /api/teams/:id
// Returns: { data: { id } } | { error: string }
export const deleteTeamMember = async (id) => {
    if (!id) {
        return { error: "Team member ID is required" };
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
        return { error: err.message || "Failed to delete team member" };
    }
};
