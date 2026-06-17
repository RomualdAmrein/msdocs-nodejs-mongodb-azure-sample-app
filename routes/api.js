var express = require("express");
var router = express.Router();
const { pool, refreshFromEurostat } = require("../models/db");

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

router.get("/refresh-inflation", async function (req, res) {
  try {
    const count = await refreshFromEurostat();
    res.json({ ok: true, updated: count });
  } catch (err) {
    console.error("Erreur refresh-inflation :", err);
    res.status(500).json({ error: "Échec de la mise à jour depuis Eurostat" });
  }
});

module.exports = router;