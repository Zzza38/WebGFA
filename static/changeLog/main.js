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

async function fetchChangeLog() {
    try {
        const response = await fetch("/api/get-changeLog", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error("Error fetching username:", error);
    }
}

document.getElementById("commitText").addEventListener("input", () => {
    const commitText = document.getElementById("commitText").value;
    const commitContainer = document.getElementById("commitContainer");
    commitContainer.innerHTML = ""; // Clear previous commits
    
    const commits = commitText.split("--||--").map(commit => commit.trim()).filter(commit => commit !== "");

    commits.forEach(commit => {
        const commitBox = document.createElement("div");
        commitBox.classList.add("commit");

        const commitLines = commit.split('\n').map(line => line.trim()).filter(line => line !== "");

        if (commitLines.length > 0) {
            const titleElement = document.createElement("h3");
            titleElement.textContent = commitLines[0];
            commitBox.appendChild(titleElement);
        }

        commitLines.slice(1).forEach(line => {
            const match = line.match(/^-\s*(.+)$/);
            if (match) {
                const listItem = document.createElement("li");
                listItem.textContent = match[1];
                commitBox.appendChild(listItem);
            }
        });

        commitContainer.appendChild(commitBox);
    });
});

document.getElementById("pushCommit").addEventListener("click", async () => {
    const commitText = document.getElementById("commitText").value;
    try {
        const response = await fetch("/api/save-changeLog", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ data: commitText })
        });
    } catch (error) {
        console.error("Error sending changelog:", error);
    }
});

let username;
(async () => {
    username = await fetchUsername();
    if (username === "sammy" || username === "zion") {
        document.getElementById("commits").style.display = "block"
        document.getElementById("message").style.display = "none"
    } else {
        document.getElementById("commits").style.display = "none"
        document.getElementById("message").style.display = "block"
        document.getElementById("commitText").value = fetchChangeLog();
    }
})();