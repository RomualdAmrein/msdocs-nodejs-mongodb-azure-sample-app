var express = require("express");
var router = express.Router();
const { pool } = require("../models/db");

router.get("/inflation", async function (req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT year, rate, event FROM inflation_history ORDER BY year ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Erreur lecture inflation_history :", err);
    res.status(500).json({ error: "Impossible de récupérer les données d'inflation" });
  }
});

module.exports = router;