const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

let sessions = {};
let botData = {};

function setSessions(s) { sessions = s; }
function setBotData(b) { botData = b; }

// API: Generate Pair Code
app.post("/api/pair", async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.length < 10) {
            return res.status(400).json({ error: "Invalid phone number" });
        }

        const userId = "web_" + Date.now();

        if (global.generatePairCode) {
            global.generatePairCode(userId, phone);
        }

        res.json({ success: true, userId, phone });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: Get Pair Code
app.get("/api/pair/:userId", (req, res) => {
    const { userId } = req.params;
    const session = sessions[userId];
    if (!session) return res.json({ status: "not_found" });
    if (session.pairCode) return res.json({ status: "success", code: session.pairCode });
    res.json({ status: "pending" });
});

// API: Status
app.get("/api/status", (req, res) => {
    const activeBots = Object.values(sessions).filter(s => s.isConnected).length;
    res.json({
        botName: "HACKER PRO ULTRA",
        online: true,
        activeBots,
        totalUsers: (botData.webUsers || []).length
    });
});

// Home
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

function startWebServer() {
    app.listen(PORT, () => {
        console.log(`🌐 Web server: http://localhost:${PORT}`);
    });
}

module.exports = { startWebServer, setSessions, setBotData };
