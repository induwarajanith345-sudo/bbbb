// ==========================================
// API: Get QR Code
// ==========================================
app.get("/api/qr", (req, res) => {
    if (global.currentQR) {
        res
