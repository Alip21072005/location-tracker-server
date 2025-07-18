// index.js (untuk AWS Lambda)
const nodemailer = require("nodemailer");

// Konfigurasi Nodemailer transporter (akan menggunakan Environment Variables di Lambda)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Handler Lambda function utama
exports.handler = async (event) => {
  // Event berisi data dari API Gateway
  let latitude, longitude, accuracy;

  // API Gateway akan meneruskan body sebagai string JSON
  try {
    const body = JSON.parse(event.body);
    latitude = body.latitude;
    longitude = body.longitude;
    accuracy = body.accuracy;
  } catch (e) {
    console.error("Gagal mem-parse body atau data tidak lengkap:", e);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Data lokasi tidak lengkap atau format JSON salah.",
      }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Penting untuk CORS dari frontend
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  if (!latitude || !longitude) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Latitude atau Longitude tidak ditemukan.",
      }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const userAgent = event.headers
    ? event.headers["User-Agent"] || "Tidak diketahui"
    : "Tidak diketahui";
  const ipAddress = event.requestContext
    ? event.requestContext.identity.sourceIp || "Tidak diketahui"
    : "Tidak diketahui";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.RECIPIENT_EMAIL,
    subject: "LOKASI PONSEL ANDA TERDETEKSI (AWS)!",
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
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Lokasi berhasil diterima dan dikirim via email.",
      }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Penting untuk CORS dari frontend
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  } catch (error) {
    console.error("Gagal mengirim email notifikasi lokasi:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Terjadi kesalahan saat mengirim email notifikasi.",
      }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }
};
