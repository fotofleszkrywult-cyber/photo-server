import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import Slider from '@mui/material/Slider';
import { motion } from 'framer-motion';
import debounce from 'lodash.debounce';

/* ---------- Pomocnicze funkcje ---------- */
function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width, height, rotation) {
  const rad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

async function getCroppedImg(imageSrc, pixelCrop, rotation = 0, scale = 0.5) {
  const image = await createImage(imageSrc);
  const rad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  const safeCanvas = document.createElement('canvas');
  safeCanvas.width = Math.round(bBoxWidth);
  safeCanvas.height = Math.round(bBoxHeight);
  const safeCtx = safeCanvas.getContext('2d');
  safeCtx.translate(safeCanvas.width / 2, safeCanvas.height / 2);
  safeCtx.rotate(rad);
  safeCtx.drawImage(image, -image.width / 2, -image.height / 2);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = Math.max(1, Math.round(pixelCrop.width * scale));
  outCanvas.height = Math.max(1, Math.round(pixelCrop.height * scale));
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(
    safeCanvas,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
    0,
    0,
    outCanvas.width,
    outCanvas.height
  );

  return new Promise((resolve) => {
    outCanvas.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      },
      'image/jpeg',
      0.8
    );
  });
}

/* ---------- Komponent główny ---------- */
export default function PhotoEditor() {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [preview, setPreview] = useState(null);
  const [orders, setOrders] = useState([]);
  const [format, setFormat] = useState('10x15');
  const [paper, setPaper] = useState('glossy');
  const [colorMode, setColorMode] = useState('color');
  const [quantity, setQuantity] = useState(1);
  const [darkMode, setDarkMode] = useState(true);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isLandscape, setIsLandscape] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [clientData, setClientData] = useState({ name: '', surname: '', address: '', phone: '' });

  const priceMap = { '10x15': 1.5, '13x18': 2, '15x21': 2.5, '18x25': 5, '21x30': 10 };
  const aspectMap = { '10x15': 2 / 3, '13x18': 13 / 18, '15x21': 5 / 7, '18x25': 18 / 25, '21x30': 7 / 10 };
  const currentAspect = isLandscape ? 1 / (aspectMap[format] || 1) : aspectMap[format] || 1;

  /* ---------- Wczytanie pliku ---------- */
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setPreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    createImage(url).then((img) => setImageSize({ width: img.width, height: img.height }));
  };

  const generatePreview = useCallback(
    debounce(async (pixels) => {
      if (!imageSrc || !pixels) return;
      const url = await getCroppedImg(imageSrc, pixels, rotation, 0.8);
      setPreview((oldUrl) => { if (oldUrl) URL.revokeObjectURL(oldUrl); return url; });
    }, 300),
    [imageSrc, rotation]
  );

  const onCropComplete = useCallback(
    (croppedArea, croppedPixels) => {
      setCroppedAreaPixels(croppedPixels);
      generatePreview(croppedPixels);
    },
    [generatePreview]
  );

  const computeMinZoom = useCallback(() => {
    if (!imageSize.width || !croppedAreaPixels) return 0.1;
    const cropW = croppedAreaPixels.width;
    const cropH = croppedAreaPixels.height;
    const rad = getRadianAngle(rotation);
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const rotatedW = cropW * cos + cropH * sin;
    const rotatedH = cropW * sin + cropH * cos;
    return Math.max(rotatedW / imageSize.width, rotatedH / imageSize.height, 0.1);
  }, [croppedAreaPixels, rotation, imageSize]);

  useEffect(() => {
    if (!imageSize.width || !croppedAreaPixels) return;
    const minZoom = computeMinZoom();
    if (zoom < minZoom) setZoom(minZoom);
  }, [rotation, zoom, croppedAreaPixels, imageSize, computeMinZoom]);

  const calculatePrice = useCallback((format, quantity) => {
    let base = priceMap[format] || 0;
    let mult = 1;
    if (quantity < 5) mult = 2;
    else if (quantity < 10) mult = 1.5;
    else if (quantity >= 100) mult = 0.5;
    return (base * mult * quantity).toFixed(2);
  }, []);

  const addOrder = () => {
    if (!preview) return;
    const newOrder = {
      id: orders.length + 1,
      format: isLandscape ? format + ' (obr.)' : format,
      paper,
      colorMode,
      quantity,
      price: calculatePrice(format, quantity),
      preview,
    };
    setOrders([newOrder, ...orders]);
    setPreview(null);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
  };

  const resetImage = () => {
    setImageSrc(null);
    setPreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
  };

  // ---------- Nowa funkcja: Wyślij zamówienie do backendu ----------
  const sendOrder = async () => {
    if (orders.length === 0) return alert('Brak zamówień.');
    if (!clientData.name || !clientData.surname || !clientData.phone) return alert('Uzupełnij dane klienta (imię, nazwisko, telefon).');

    try {
      const formData = new FormData();

      // Dodaj każdą miniaturę jako plik (w tej samej kolejności co orders)
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        // fetch preview blob
        const blob = await fetch(o.preview).then(r => r.blob());
        // name will be temporary; backend zmieni nazwę finalną
        formData.append('photos', blob, `photo-${o.id}.jpg`);
      }

      // Dokładne dane zamówienia
      formData.append('data', JSON.stringify({ clientData, orders }));

      const res = await fetch('http://localhost:5000/api/order', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        alert('✅ Zamówienie zapisane na serwerze!');
        // wyczyść zamówienia
        setOrders([]);
        setShowOrderForm(false);
        setClientData({ name: '', surname: '', address: '', phone: '' });
      } else {
        alert('❌ Błąd serwera: ' + (json.error || 'nieznany')); 
      }
    } catch (err) {
      console.error(err);
      alert('❌ Błąd połączenia lub przetwarzania. Sprawdź konsolę.');
    }
  };

  return (
    <motion.div animate={{ backgroundColor: darkMode ? "#1a1a1a" : "#f5f5f5" }} transition={{ duration: 0.5 }} style={{ minHeight: "100vh", padding: 20 }}>
      <div style={{ display: 'flex', gap: 20 }}>
        {/* Lewy panel */}
        <div style={{ width: '60%', backgroundColor: darkMode ? "#333" : "#fff", borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, height: 900 }}>
          <div style={{ flex: 1, width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

            {/* Pole wyboru zdjęcia przed wgraniem */}
            {!imageSrc && !preview && (
              <div style={{ width: '100%', height: 400, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8, overflow: 'hidden', backgroundColor: darkMode ? '#444' : '#eee' }}>
                <input type="file" onChange={onFileChange} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                <span style={{ color: '#888', pointerEvents: 'none' }}>Wybierz zdjęcie</span>
              </div>
            )}

            {/* Cropper + przycisk */}
            {imageSrc && (
              <>
                <div style={{ width: '100%', height: 400, position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={currentAspect}
                    cropShape="rect"
                    objectFit="contain"
                    restrictPosition={true}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={(v) => setZoom(Math.max(v, computeMinZoom()))}
                    showGrid={true}
                  />
                </div>

                <motion.button whileHover={{ scale: 1.05 }} onClick={resetImage} style={{ marginTop: 10 }}>Wybierz inne zdjęcie</motion.button>

                {/* Podgląd kadru */}
                {preview && (
                  <div style={{ width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 20 }}>
                    <div style={{ marginBottom: 5, fontWeight: 'bold', color: '#fff' }}>Podgląd kadru</div>
                    <div style={{ width: 300, height: 300, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
                      <img
                        src={preview}
                        alt="Live preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          filter: colorMode === 'bw' ? 'grayscale(100%)' : colorMode === 'sepia' ? 'sepia(100%)' : 'none',
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Prawy panel */}
        <div style={{ width: '40%', padding: 20, borderRadius: 8, backgroundColor: darkMode ? '#222' : '#fff', color: darkMode ? '#fff' : '#000', display: 'flex', flexDirection: 'column', gap: 12, transition: 'background-color 0.5s, color 0.5s' }}>
          <motion.button onClick={() => setDarkMode(!darkMode)} whileHover={{ scale: 1.2 }} style={{ fontSize: 24, cursor: 'pointer', background: 'transparent', border: 'none', color: darkMode ? "#FFD700" : "#555" }}>
            {darkMode ? "🌞" : "🌙"}
          </motion.button>

          <label>Format papieru</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="10x15">10×15</option>
            <option value="13x18">13×18</option>
            <option value="15x21">15×21</option>
            <option value="18x25">18×25</option>
            <option value="21x30">21×30</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={isLandscape} onChange={e => setIsLandscape(e.target.checked)} /> Obróć orientację
          </label>

          <label>Rodzaj papieru</label>
          <select value={paper} onChange={(e) => setPaper(e.target.value)}>
            <option value="glossy">Glossy</option>
            <option value="lustre">Lustre</option>
          </select>

          <label>Kolor</label>
          <select value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
            <option value="color">Kolorowe</option>
            <option value="bw">Czarno-białe</option>
            <option value="sepia">Sepia</option>
          </select>

          <label>Ilość</label>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />

          <label>Zoom</label>
          <Slider min={0.1} max={3} step={0.01} value={zoom} onChange={(_, v) => setZoom(Math.max(v, computeMinZoom()))} />

          <label>Obrót kadru (°)</label>
          <Slider min={-180} max={180} step={1} value={rotation} onChange={(_, v) => setRotation(v)} />

          <motion.button whileHover={{ scale: 1.05 }} onClick={addOrder} style={{ marginTop: 10 }}>Dodaj do zamówień</motion.button>

          <h3 style={{ marginTop: 20 }}>Zamówienia</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {orders.map((o, index) => (
              <li key={o.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 10, backgroundColor: darkMode ? '#333' : '#f5f5f5', padding: 8, borderRadius: 6 }}>
                <img src={o.preview} alt="mini" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }} />
                <div style={{ flex: 1 }}>
                  <div>{o.format}, {o.paper}, {o.colorMode}</div>
                </div>
                <input type="number" min="1" value={o.quantity} onChange={(e) => {
                  const newQuantity = Number(e.target.value);
                  setOrders(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], quantity: newQuantity, price: calculatePrice(updated[index].format, newQuantity) };
                    return updated;
                  });
                }} style={{ width: 60, textAlign: 'center', borderRadius: 4 }} />
                <div style={{ width: 60, textAlign: 'right' }}>{o.price} zł</div>
                <button onClick={() => setOrders(prev => prev.filter(order => order.id !== o.id))} style={{ cursor: 'pointer', border: 'none', background: 'transparent', color: 'red', fontSize: 16 }}>❌</button>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 10, fontWeight: 'bold', textAlign: 'right' }}>
            Łączna kwota: {orders.reduce((sum, o) => sum + Number(o.price), 0).toFixed(2)} zł
          </div>

          {orders.length > 0 && !showOrderForm &&
            <motion.button
              whileHover={{ scale: 1.05 }}
              style={{ marginTop: 20 }}
              onClick={() => setShowOrderForm(true)}
            >
              Realizuj zamówienie
            </motion.button>
          }

          {showOrderForm && (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                placeholder="Imię"
                value={clientData.name}
                onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Nazwisko"
                value={clientData.surname}
                onChange={(e) => setClientData({ ...clientData, surname: e.target.value })}
              />
              <input
                type="text"
                placeholder="Adres"
                value={clientData.address}
                onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
              />
              <input
                type="text"
                placeholder="Telefon"
                value={clientData.phone}
                onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
              />
             <motion.button
  whileHover={{ scale: 1.05 }}
  style={{ marginTop: 10 }}
  onClick={async () => {
    try {
      const formData = new FormData();
      formData.append("name", clientData.name);
      formData.append("surname", clientData.surname);
      formData.append("address", clientData.address);
      formData.append("phone", clientData.phone);

      orders.forEach((order, index) => {
        formData.append(`orders[${index}][format]`, order.format);
        formData.append(`orders[${index}][paper]`, order.paper);
        formData.append(`orders[${index}][colorMode]`, order.colorMode);
        formData.append(`orders[${index}][quantity]`, order.quantity);
        formData.append(`orders[${index}][price]`, order.price);

        // zamiana URL blob (preview) na plik
        fetch(order.preview)
          .then(res => res.blob())
          .then(blob => {
            formData.append(`orders[${index}][image]`, blob, `${order.quantity}_${order.colorMode}.jpg`);
          });
      });

      const res = await fetch("http://localhost:5001/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Błąd serwera");

      alert("✅ Zamówienie wysłane!");
      setOrders([]);
      setClientData({ name: "", surname: "", address: "", phone: "" });
      setShowOrderForm(false);
    } catch (err) {
      console.error("❌ Błąd połączenia lub przetwarzania:", err);
      alert("❌ Błąd połączenia lub przetwarzania. Sprawdź konsolę.");
    }
  }}
>
  Wyślij zamówienie
</motion.button>

            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
