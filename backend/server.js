const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// multer - pamięć (bez zapisu do tmp)
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", upload.any(), async (req, res) => {
  try {
    const { name, surname, address, phone } = req.body;

    if (!name || !surname || !phone) {
      return res.status(400).json({ success: false, error: "Brak danych klienta" });
    }

    const baseDir = path.join("uploads", `${name}_${surname}_${phone}`);
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    let totalSaved = 0;
    let totalPrice = 0;
    let logLines = [];

    for (let i = 0; ; i++) {
      const format =
        req.body[`orders[${i}][format]`] ||
        req.body[`orders.${i}.format`] ||
        (req.body.orders && req.body.orders[i] && req.body.orders[i].format) ||
        null;
      const paper =
        req.body[`orders[${i}][paper]`] ||
        req.body[`orders.${i}.paper`] ||
        (req.body.orders && req.body.orders[i] && req.body.orders[i].paper) ||
        null;
      const colorMode =
        req.body[`orders[${i}][colorMode]`] ||
        req.body[`orders.${i}.colorMode`] ||
        (req.body.orders && req.body.orders[i] && req.body.orders[i].colorMode) ||
        "kolor";
      const quantity =
        req.body[`orders[${i}][quantity]`] ||
        req.body[`orders.${i}.quantity`] ||
        (req.body.orders && req.body.orders[i] && req.body.orders[i].quantity) ||
        "1";
      const price =
        parseFloat(
          req.body[`orders[${i}][price]`] ||
          req.body[`orders.${i}.price`] ||
          (req.body.orders && req.body.orders[i] && req.body.orders[i].price) ||
          "0"
        ) || 0;

      if (!format && !paper) break;

      const folderPath = path.join(baseDir, `${format}_${paper}`);
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

      const file = req.files.find((f) => f.fieldname === `orders[${i}][image]`);
      if (file) {
        const fileNumber = i + 1;
        const filename = `${quantity}szt_${colorMode}_${fileNumber}.jpg`;
        const fullPath = path.join(folderPath, filename);

        fs.writeFileSync(fullPath, file.buffer);
        totalSaved++;
        totalPrice += price;

        logLines.push(
          `${fileNumber}. Format: ${format}, Papier: ${paper}, Kolor: ${colorMode}, Ilość: ${quantity}, Cena: ${price.toFixed(
            2
          )} zł → ${format}_${paper}\\${filename}`
        );
      }
    }

    const now = new Date().toLocaleString("pl-PL");
    const txtContent = [
      `ZAMÓWIENIE – ${now}`,
      `Imię: ${name}`,
      `Nazwisko: ${surname}`,
      `Adres: ${address || "-"}`,
      `Telefon: ${phone}`,
      "",
      "LISTA ZDJĘĆ:",
      ...logLines,
      "",
      `RAZEM: ${totalSaved} plików`,
      `SUMA: ${totalPrice.toFixed(2)} zł`,
    ].join("\n");

    const txtPath = path.join(baseDir, "zamowienie.txt");
    fs.writeFileSync(txtPath, txtContent, "utf8");

    return res.json({ success: true, message: `Zapisano ${totalSaved} plików` });
  } catch (err) {
    console.error("Błąd zapisu:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/", (req, res) => res.send("Serwer działa"));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
