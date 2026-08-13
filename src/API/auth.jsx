import md5 from 'crypto-js/md5';
export const handleLogin = async (username, password) => {
    if (!username || !password) {
        return { error: "Please enter both username and password." };
    }

    try {
        const hashedPassword = md5(password).toString();
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/login`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password:hashedPassword })
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json.data };
    } catch (err) {
        return { error: err.message || "Login failed" };
    }
}


export const handleLogout = async () => {
    try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/logout`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json };
    } catch (err) {
        return { error: err.message || "Login failed" };
    }
}

export const changePassword = async (currentPassword, newPassword, profile_id) => {
    if (!currentPassword || !newPassword || !profile_id) {
        return { error: "Missing required parameters: currentPassword, newPassword, and profile_id" };
    }

    try {
        const hashedCurrent = md5(currentPassword).toString();
        const hashedNew = md5(newPassword).toString();

        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/update-password`, {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                currentPassword: hashedCurrent,
                newPassword: hashedNew,
                profile_id
            })
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(json?.message || `HTTP error! Status: ${response.status}`);
        }

        return { data: json };
    } catch (err) {
        return { error: err.message || "Failed to update password" };
    }
}