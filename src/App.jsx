import { useEffect, useState } from "react";

function App() {
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/hello")
            .then(res => res.json())
            .then(data => {
                setMessage(data.message);
            });
    }, []);

    return (
        <div>
            <h1>My Unified Vercel App</h1>

            <p>{message}</p>
        </div>
    );
}

export default App;