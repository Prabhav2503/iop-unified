// Contact API functions
// Mirrors backend routes in contactroutes.js

const BASE = `${import.meta.env.VITE_BACKEND_URL}/api/contacts`;

// GET /api/contacts
// Returns all contacts with full fields
// Returns: { data: Contact[] } | { error: string }
export const getAllContacts = async () => {
    try {
        const response = await fetch(`${BASE}`, {
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
        return { error: err.message || "Failed to fetch contacts" };
    }
};

// GET /api/contacts → filtered to visibility === true
// Returns: { data: Contact[] } | { error: string }
export const getVisibleContacts = async () => {
    try {
        const result = await getAllContacts();
        if (result.error) return result;
        
        const visibleContacts = (result.data || []).filter((contact) => contact.visibility === true);
        return { data: visibleContacts };
    } catch (err) {
        return { error: err.message || "Failed to fetch visible contacts" };
    }
};


// GET /api/contacts/all
// Returns summary list: { id, name, startup_name }
// Returns: { data: ContactSummary[] } | { error: string }
export const getContactsSummary = async () => {
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
        return { error: err.message || "Failed to fetch contacts summary" };
    }
};

// POST /api/contacts
// Body: { name, number, email, tags, organization, dataset_id, roles }
// Returns: { data: Contact } | { error: string }
export const createContact = async ({ name, number, email, tags, organization, dataset_id, roles }) => {
    if (!name) {
        return { error: "Contact name is required" };
    }

    try {
        const response = await fetch(`${BASE}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, number, email, tags, organization, dataset_id, roles })
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Failed to create contact" };
    }
};

// PATCH /api/contacts/:id
// Body (all optional): { name, number, email, tags, organization, dataset_id, roles }
// Returns: { data: Contact } | { error: string }
export const updateContact = async (id, updates) => {
    if (!id) {
        return { error: "Contact ID is required" };
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
        return { error: err.message || "Failed to update contact" };
    }
};

// DELETE /api/contacts/:id
// Returns: { data: { id } } | { error: string }
export const deleteContact = async (id) => {
    if (!id) {
        return { error: "Contact ID is required" };
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
        return { error: err.message || "Failed to delete contact" };
    }
};

// PATCH /api/contacts/visibility/:id
// Flips contact visibility boolean (requires privileged role)
// Returns: { data: Contact, message: string } | { error: string }
export const toggleContactVisibility = async (id) => {
    if (!id) {
        return { error: "Contact ID is required" };
    }

    try {
        const response = await fetch(`${BASE}/visibility/${id}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({})
        });


        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data, message: json.message };
    } catch (err) {
        return { error: err.message || "Failed to toggle contact visibility" };
    }
};

