require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Koneksi ke Database (Contoh MongoDB)
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Terhubung ke MongoDB"))
  .catch((err) => console.error("Gagal terhubung ke MongoDB:", err));

// Schema untuk menyimpan lokasi
const LocationSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  accuracy: Number,
  timestamp: { type: Date, default: Date.now },
});
const Location = mongoose.model("Location", LocationSchema);

// Middleware untuk melayani file statis (HTML, CSS, JS) dari frontend
app.use(express.static(path.join(__dirname, "public"))); // Asumsikan file frontend ada di folder 'public'

// Endpoint untuk menerima lokasi (jika tidak menggunakan Socket.IO untuk inisial)
app.post("/send-location", express.json(), async (req, res) => {
  const { latitude, longitude, accuracy } = req.body;
  if (latitude && longitude) {
    try {
      const newLocation = new Location({ latitude, longitude, accuracy });
      await newLocation.save();
      console.log("Lokasi diterima (POST):", { latitude, longitude, accuracy });
      // Kirim ke semua klien yang terhubung melalui WebSocket
      io.emit("locationUpdate", {
        latitude,
        longitude,
        accuracy,
        timestamp: newLocation.timestamp,
      });
      res.status(200).json({ message: "Lokasi berhasil diterima" });
    } catch (error) {
      console.error("Gagal menyimpan lokasi:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(400).json({ message: "Data lokasi tidak lengkap" });
  }
});

// WebSocket connection untuk real-time
io.on("connection", (socket) => {
  console.log("Klien terhubung melalui WebSocket");

  // Menerima data lokasi dari frontend melalui WebSocket
  socket.on("sendLocation", async (data) => {
    const { latitude, longitude, accuracy } = data;
    if (latitude && longitude) {
      try {
        const newLocation = new Location({ latitude, longitude, accuracy });
        await newLocation.save();
        console.log("Lokasi diterima (WebSocket):", {
          latitude,
          longitude,
          accuracy,
        });
        // Kirim balik ke semua klien yang terhubung (termasuk diri Anda)
        io.emit("locationUpdate", {
          latitude,
          longitude,
          accuracy,
          timestamp: newLocation.timestamp,
        });
      } catch (error) {
        console.error("Gagal menyimpan lokasi via WebSocket:", error);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Klien terputus dari WebSocket");
  });
});

// Anda bisa membuat halaman admin sederhana untuk melihat lokasi
app.get("/admin", async (req, res) => {
  try {
    const locations = await Location.find().sort({ timestamp: -1 }).limit(10); // Ambil 10 lokasi terakhir

    // Pisahkan data JavaScript yang akan disuntikkan
    const initialLocationsJson = JSON.stringify(locations);

    let html = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Lokasi Terdeteksi</title>
                <style>
                    body { font-family: sans-serif; margin: 20px; }
                    #map { height: 400px; width: 100%; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 20px; }
                    ul { list-style: none; padding: 0; }
                    li { margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9; }
                    li:nth-child(even) { background-color: #f2f2f2; }
                </style>
                <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
            </head>
            <body>
                <h1>Lokasi HP Anda (Real-time)</h1>
                <div id="map"></div>
                <h2>Data Lokasi:</h2>
                <ul id="locationList">
                    </ul>

                <script src="/socket.io/socket.io.js"></script>
                <script>
                    const socket = io();
                    const locationList = document.getElementById('locationList');
                    let map = null;
                    let marker = null;

                    function initMap(latitude, longitude) {
                        if (map) {
                            map.remove(); // Hapus peta lama jika ada
                        }
                        map = L.map('map').setView([latitude, longitude], 13);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        }).addTo(map);
                        marker = L.marker([latitude, longitude]).addTo(map)
                            .bindPopup('Lokasi Terkini').openPopup();
                    }

                    function updateMap(latitude, longitude) {
                        if (marker) {
                            marker.setLatLng([latitude, longitude]);
                            marker.bindPopup('Lokasi Terkini: ' + new Date().toLocaleString()).openPopup();
                        } else {
                            initMap(latitude, longitude);
                        }
                        map.setView([latitude, longitude], 16); // Perbesar zoom
                    }

                    socket.on('locationUpdate', (data) => {
                        console.log('Lokasi diterima via WebSocket:', data);
                        const li = document.createElement('li');
                        li.innerHTML = \`Latitude: \${data.latitude}, Longitude: \${data.longitude}, Akurasi: \${data.accuracy}m, Waktu: \${new Date(data.timestamp).toLocaleString()}\`;
                        locationList.prepend(li); // Tambahkan ke paling atas
                        if (locationList.children.length > 20) { // Batasi jumlah item
                            locationList.removeChild(locationList.lastChild);
                        }
                        updateMap(data.latitude, data.longitude);
                    });

                    // Muat lokasi awal saat halaman dimuat
                    document.addEventListener('DOMContentLoaded', () => {
                        // Gunakan variabel yang sudah di-stringify
                        const initialLocations = JSON.parse('${initialLocationsJson}'); // Di sini perbaikannya
                        if (initialLocations.length > 0) {
                            initialLocations.forEach(loc => {
                                const li = document.createElement('li');
                                li.innerHTML = \`Latitude: \${loc.latitude}, Longitude: \${loc.longitude}, Akurasi: \${loc.accuracy}m, Waktu: \${new Date(loc.timestamp).toLocaleString()}\`;
                                locationList.appendChild(li);
                            });
                            // Tampilkan lokasi terakhir di peta
                            const lastLoc = initialLocations[0];
                            initMap(lastLoc.latitude, lastLoc.longitude);
                        }
                    });
                </script>
            </body>
            </html>
        `;
    res.send(html);
  } catch (error) {
    console.error("Gagal mengambil lokasi:", error);
    res.status(500).send("Terjadi kesalahan saat memuat halaman admin.");
  }
});

server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Frontend diakses di http://localhost:${PORT}`);
  console.log(`Halaman admin diakses di http://localhost:${PORT}/admin`);
});
