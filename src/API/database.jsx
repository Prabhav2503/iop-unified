// Database API functions
// Handles backend routes for /api/database

const BASE = `${import.meta.env.VITE_BACKEND_URL}/api/databases`;

// GET /api/database/all
// Returns: { data: DatabaseRecord[] } | { error: string }
export const getAllDatabaseRecords = async () => {
  try {
    const response = await fetch(`${BASE}/all`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
    }

    return { data: json.data || json };
  } catch (err) {
    return { error: err.message || "Failed to fetch database records" };
  }
};

// GET /api/database/:id
// Returns: { data: DatabaseRecord } | { error: string }
export const getDatabaseRecordById = async (id) => {
  if (!id) {
    return { error: "Database record ID is required" };
  }

  try {
    const response = await fetch(`${BASE}/${id}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
    }

    return { data: json.data };
  } catch (err) {
    return { error: err.message || "Failed to fetch database record" };
  }
};

// POST /api/database
// Body: { name, description, drive_url, created_by }
// Returns: { data: DatabaseRecord, message: string } | { error: string }
export const createDatabaseRecord = async ({ name, description, drive_url, created_by }) => {
  if (!drive_url) {
    return { error: "Drive URL is required" };
  }
  if (!name) {
    return { error: "Resource name is required" };
  }

  try {
    const response = await fetch(`${BASE}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, description, drive_url, created_by }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
    }

    return { data: json.data, message: json.message };
  } catch (err) {
    return { error: err.message || "Failed to create database record" };
  }
};

// PATCH /api/database/:id
// Body: { name, description, drive_url, created_by }
// Returns: { data: DatabaseRecord, message: string } | { error: string }
export const updateDatabaseRecord = async (id, updates) => {
  if (!id) {
    return { error: "Database record ID is required" };
  }

  try {
    const response = await fetch(`${BASE}/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
    }

    return { data: json.data, message: json.message };
  } catch (err) {
    return { error: err.message || "Failed to update database record" };
  }
};

// DELETE /api/database/:id
// Returns: { data: { id }, message: string } | { error: string }
export const deleteDatabaseRecord = async (id) => {
  if (!id) {
    return { error: "Database record ID is required" };
  }

  try {
    const response = await fetch(`${BASE}/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
    }

    return { data: json.data, message: json.message };
  } catch (err) {
    return { error: err.message || "Failed to delete database record" };
  }
};
