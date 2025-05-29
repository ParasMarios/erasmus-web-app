const express = require("express");
const bodyParser = require("body-parser");
const pool = require("./erasmus_db"); // σύνδεση DB
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads")); // φάκελος για αποθήκευση αρχείων
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });
const app = express();
const PORT = 3000;

app.use(express.static("public")); // για να σερβίρει HTML/CSS/JS
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/register", async (req, res) => {
  const {
    first_name,
    last_name,
    student_id,
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
      [first_name, last_name, student_id, phone, email, username, password]
    );

    res.status(200).send("Επιτυχής εγγραφή!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Σφάλμα διακομιστή.");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (result.rows.length > 0) {
      res.status(200).send("Σύνδεση επιτυχής!");
    } else {
      res.status(401).send("Λάθος στοιχεία σύνδεσης.");
    }
  } catch (err) {
    console.error("Σφάλμα σύνδεσης:", err);
    res.status(500).send("Σφάλμα διακομιστή.");
  }
});

app.post("/user-info", async (req, res) => {
  const { username } = req.body;

  try {
    const result = await pool.query(
      `SELECT name, lastname, personalnumber, phone, email, password
       FROM users WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("User not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Σφάλμα κατά την ανάκτηση στοιχείων:", err);
    res.status(500).send("Σφάλμα διακομιστή");
  }
});

app.get("/universities", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, university_name FROM universities ORDER BY university_name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Σφάλμα κατά την ανάκτηση πανεπιστημίων:", err);
    res.status(500).send("Σφάλμα διακομιστή.");
  }
});

app.post("/update-profile", async (req, res) => {
  const { username, name, lastname, personalnumber, phone, email, password } =
    req.body;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = $1, lastname = $2, personalnumber = $3, phone = $4, email = $5, password = $6 
       WHERE username = $7`,
      [name, lastname, personalnumber, phone, email, password, username]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Ο χρήστης δεν βρέθηκε.");
    }

    res.status(200).send("Ενημερώθηκε επιτυχώς.");
  } catch (err) {
    console.error("Σφάλμα ενημέρωσης:", err);
    res.status(500).send("Σφάλμα διακομιστή.");
  }
});

app.get("/check-username", async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const result = await pool.query(
      "SELECT username FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length > 0) {
      res.json({ found: true });
    } else {
      res.json({ found: false });
    }
  } catch (err) {
    console.error("Σφάλμα ελέγχου username:", err);
    res.status(500).json({ error: "Σφάλμα διακομιστή" });
  }
});

app.post(
  "/submit-application",
  upload.fields([
    { name: "grades" },
    { name: "english_certificate" },
    { name: "other_certificates" },
  ]),
  async (req, res) => {
    try {
      const get = (v) => (Array.isArray(v) ? v[0] : v);

      const {
        username,
        first_name,
        last_name,
        student_id,
        passed_percentage,
        average,
        english_level,
        other_lang,
        uni1,
        uni2,
        uni3,
        terms,
      } = req.body;

      const grades_file = req.files["grades"]?.[0]?.filename || null;
      const english_certificate_file =
        req.files["english_certificate"]?.[0]?.filename || null;
      const other_certificates_file =
        req.files["other_certificates"]?.map((f) => f.filename) || [];

      await pool.query(
        `
        INSERT INTO applications (
          username, first_name, last_name, student_id,
          passed_percentage, average, english_level, knows_other_languages,
          university_1_id, university_2_id, university_3_id,
          grades_file, english_certificate_file, other_certificates_file,
          submitted_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14,
          NOW()
        )
      `,
        [
          get(username),
          get(first_name),
          get(last_name),
          get(student_id),
          get(passed_percentage),
          get(average),
          get(english_level),
          get(other_lang) === "yes",
          get(uni1),
          get(uni2),
          get(uni3),
          grades_file,
          english_certificate_file,
          other_certificates_file,
        ]
      );

      res.status(200).send("Η αίτηση υποβλήθηκε επιτυχώς!");
    } catch (err) {
      console.error("Σφάλμα κατά την υποβολή:", err);
      res.status(500).send("Αποτυχία αποθήκευσης.");
    }
  }
);

// Ξεκινάμε τον server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
