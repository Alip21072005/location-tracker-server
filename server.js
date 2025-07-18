require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const axios = require("axios"); // Untuk membuat HTTP request ke API IPFS Pinning

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Konfigurasi API Pinata (contoh)
const pinataApiUrl = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const pinataApiKey = process.env.IPFS_API_KEY;
const pinataApiSecret = process.env.IPFS_API_SECRET;

// Middleware untuk melayani file statis
app.use(express.static(path.join(__dirname, "public")));

// WebSocket connection
io.on("connection", (socket) => {
  console.log("Klien terhubung melalui WebSocket");

  socket.on("sendLocation", async (data) => {
    const { latitude, longitude, accuracy } = data;
    if (latitude && longitude) {
      console.log("Lokasi diterima (WebSocket):", {
        latitude,
        longitude,
        accuracy,
      });

      // Data yang akan dikirim ke IPFS
      const locationData = {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString(),
        userAgent: socket.request.headers["user-agent"], // Info browser/OS
        // Anda bisa tambahkan info lain yang relevan di sini
      };

      try {
        // Mengirim data JSON ke Pinata IPFS
        const pinataResponse = await axios.post(
          pinataApiUrl,
          { pinataContent: locationData }, // Data yang akan di-pin
          {
            headers: {
              "Content-Type": "application/json",
              pinata_api_key: pinataApiKey,
              pinata_secret_api_key: pinataApiSecret,
            },
          },
        );

        const ipfsHash = pinataResponse.data.IpfsHash;
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`; // Atau gateway lain

        console.log("Data lokasi berhasil diunggah ke IPFS:", ipfsUrl);

        // Kirim notifikasi ke klien yang terhubung (misal, halaman pemantau Anda)
        io.emit("locationUpdate", {
          latitude,
          longitude,
          accuracy,
          timestamp: locationData.timestamp,
          ipfsHash,
          ipfsUrl,
        });

        // --- (Opsional) Tulis IPFS Hash ke Blockchain ---
        // Bagian ini memerlukan setup Ethers.js/Web3.js, smart contract,
        // dan dompet dengan saldo kripto. Sangat kompleks dan mahal di mainnet.
        // Anda akan memanggil fungsi di smart contract Anda untuk menyimpan ipfsHash.
        // console.log("Mencoba menulis hash ke blockchain...");
        // const tx = await yourSmartContract.writeLocationHash(ipfsHash);
        // await tx.wait(); // Tunggu transaksi dikonfirmasi
        // console.log("Hash berhasil ditulis ke blockchain:", tx.hash);
        // --- End Opsional Blockchain ---
      } catch (error) {
        console.error(
          "Gagal mengunggah lokasi ke IPFS:",
          error.response ? error.response.data : error.message,
        );
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Klien terputus dari WebSocket");
  });
});

// Halaman pemantau sederhana (tanpa database)
// Akan menampilkan data yang baru masuk via WebSocket, termasuk IPFS Hash
app.get("/admin-web3", (req, res) => {
  res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lokasi Web3 Terdeteksi</title>
            <style>
                body { font-family: sans-serif; margin: 20px; }
                ul { list-style: none; padding: 0; }
                li { margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9; }
                a { color: #007bff; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
            <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
            <script src="/socket.io/socket.io.js"></script>
        </head>
        <body>
            <h1>Lokasi Terdeteksi (Web3)</h1>
            <div id="map" style="height: 400px; width: 100%; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 20px;"></div>
            <h2>Data Lokasi:</h2>
            <ul id="locationList">
                </ul>

            <script>
                const socket = io();
                const locationList = document.getElementById('locationList');
                let map = null;
                let marker = null;

                function initMap(latitude, longitude) {
                    if (map) {
                        map.remove();
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
                    map.setView([latitude, longitude], 16);
                }

                socket.on('locationUpdate', (data) => {
                    console.log('Lokasi diterima via WebSocket:', data);
                    const li = document.createElement('li');
                    li.innerHTML = \`
                        Latitude: \${data.latitude}, Longitude: \${data.longitude}, Akurasi: \${data.accuracy}m, Waktu: \${new Date(data.timestamp).toLocaleString()}<br>
                        IPFS Hash: <a href="https://gateway.pinata.cloud/ipfs/\${data.ipfsHash}" target="_blank">\${data.ipfsHash}</a>
                    \`;
                    locationList.prepend(li);
                    if (locationList.children.length > 20) {
                        locationList.removeChild(locationList.lastChild);
                    }
                    updateMap(data.latitude, data.longitude);
                });

                // Inisialisasi peta dengan lokasi default jika tidak ada data awal
                document.addEventListener('DOMContentLoaded', () => {
                    initMap(-6.2088, 106.8456); // Lokasi default (misal: Jakarta)
                });
            </script>
        </body>
        </html>
    `);
});

server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Frontend diakses di http://localhost:${PORT}`);
  console.log(
    `Halaman Web3 admin diakses di http://localhost:${PORT}/admin-web3`,
  );
});
