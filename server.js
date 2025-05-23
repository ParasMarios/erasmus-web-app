const express = require("express");
const bodyParser = require("body-parser");
const pool = require("./erasmus_db"); // σύνδεση DB

const app = express();
const PORT = 3000;

app.use(express.static("public")); // για να σερβίρει HTML/CSS/JS
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Π.χ. Route εγγραφής χρήστη
app.post("/register", async (req, res) => {
  const {
    first_name,
    last_name,
    personal_number,
    phone,
    email,
    username,
    password,
  } = req.body;

  try {
    // Έλεγχος αν υπάρχει ίδιο username
    const checkUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (checkUser.rows.length > 0) {
      return res.status(400).send("Το username υπάρχει ήδη.");
    }

    // Εισαγωγή νέου χρήστη
    await pool.query(
      "INSERT INTO users (name, lastname, personalnumber, phone, email, username, password) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [first_name, last_name, personal_number, phone, email, username, password]
    );

    res.status(200).send("Επιτυχής εγγραφή!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Σφάλμα διακομιστή.");
  }
});

// Ξεκινάμε τον server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
