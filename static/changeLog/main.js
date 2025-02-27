async function fetchUsername() {
    try {
        const response = await fetch("/api/get-user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error("Error fetching username:", error);
    }
}

