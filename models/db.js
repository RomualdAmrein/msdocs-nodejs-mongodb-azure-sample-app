const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

const SEED_DATA = [
  { year: 1991, rate: 4.5, event: "Réunification allemande, tensions inflationnistes" },
  { year: 1992, rate: 4.3, event: "Crise du SME, dévaluation de plusieurs monnaies" },
  { year: 1993, rate: 3.6, event: "Récession européenne post-réunification" },
  { year: 1994, rate: 3.0, event: "Reprise économique progressive" },
  { year: 1995, rate: 2.8, event: "Stabilisation progressive des prix" },
  { year: 1996, rate: 2.2, event: "Critères de convergence de Maastricht en vigueur" },
  { year: 1997, rate: 1.7, event: "Préparation à l'euro, discipline budgétaire renforcée" },
  { year: 1998, rate: 1.1, event: "Crise financière asiatique, faible inflation importée" },
  { year: 1999, rate: 1.1, event: "Lancement de l'euro (monnaie scripturale)" },
  { year: 2000, rate: 2.1, event: "Choc pétrolier, l'euro physique en préparation" },
  { year: 2001, rate: 2.4, event: "Attentats du 11 septembre, ralentissement mondial" },
  { year: 2002, rate: 2.3, event: "Introduction des pièces et billets euro" },
  { year: 2003, rate: 2.1, event: "Guerre en Irak, hausse des matières premières" },
  { year: 2004, rate: 2.1, event: "Élargissement UE à 10 nouveaux membres" },
  { year: 2005, rate: 2.2, event: "Hausse du pétrole (ouragan Katrina)" },
  { year: 2006, rate: 2.2, event: "Croissance robuste, BCE commence à relever les taux" },
  { year: 2007, rate: 2.1, event: "Début crise des subprimes aux États-Unis" },
  { year: 2008, rate: 3.3, event: "Pic pétrole (147$/baril), crise financière mondiale" },
  { year: 2009, rate: 0.3, event: "Grande récession, effondrement de la demande" },
  { year: 2010, rate: 1.6, event: "Début crise des dettes souveraines grecques" },
  { year: 2011, rate: 2.7, event: "Crise de la dette en zone euro, Grèce/Portugal/Irlande" },
  { year: 2012, rate: 2.5, event: "BCE : 'whatever it takes' (Draghi)" },
  { year: 2013, rate: 1.4, event: "Risque de déflation, taux BCE proches de zéro" },
  { year: 2014, rate: 0.4, event: "Faible inflation, QE envisagé par la BCE" },
  { year: 2015, rate: 0.0, event: "Lancement du QE (assouplissement quantitatif) BCE" },
  { year: 2016, rate: 0.2, event: "Pétrole bas, inflation très en dessous de la cible 2%" },
  { year: 2017, rate: 1.5, event: "Reprise économique, inflation remonte lentement" },
  { year: 2018, rate: 1.8, event: "Proche de la cible, BCE réduit progressivement le QE" },
  { year: 2019, rate: 1.2, event: "Ralentissement mondial, tensions commerciales USA/Chine" },
  { year: 2020, rate: 0.3, event: "COVID-19 : choc de demande, confinements mondiaux" },
  { year: 2021, rate: 2.6, event: "Rebond post-COVID, pénuries de semi-conducteurs" },
  { year: 2022, rate: 8.4, event: "Guerre en Ukraine, crise énergétique — record historique" },
  { year: 2023, rate: 5.4, event: "Cycle de hausse des taux BCE (4,5%), désinflation" },
  { year: 2024, rate: 2.4, event: "Désinflation confirmée, BCE baisse ses taux en juin" },
  { year: 2025, rate: 2.2, event: "Inflation proche de la cible BCE de 2%" },
];

async function initInflationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inflation_history (
      year INTEGER PRIMARY KEY,
      rate NUMERIC(4,1) NOT NULL,
      event TEXT
    )
  `);

  const { rows } = await pool.query("SELECT COUNT(*) FROM inflation_history");
  if (parseInt(rows[0].count, 10) === 0) {
    for (const d of SEED_DATA) {
      await pool.query(
        "INSERT INTO inflation_history (year, rate, event) VALUES ($1, $2, $3)",
        [d.year, d.rate, d.event]
      );
    }
    console.log(`inflation_history : ${SEED_DATA.length} lignes insérées`);
  }
}

async function refreshFromEurostat() {
  const url = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_ainr?format=JSON&lang=EN&geo=EA&coicop18=TOTAL";
  const resp = await fetch(url);
  const json = await resp.json();

  const years = Object.keys(json.dimension.time.category.index)
    .sort((a, b) => json.dimension.time.category.index[a] - json.dimension.time.category.index[b]);
  const nbYears = years.length;
  const rateUnitIndex = json.dimension.unit.category.index["RCH_A_AVG"];

  let updated = 0;
  for (let t = 0; t < nbYears; t++) {
    const flatIndex = rateUnitIndex * nbYears + t;
    const rate = json.value[String(flatIndex)];
    if (rate === undefined) continue;
    const year = parseInt(years[t], 10);
    await pool.query(
      `INSERT INTO inflation_history (year, rate, event)
       VALUES ($1, $2, '')
       ON CONFLICT (year) DO UPDATE SET rate = EXCLUDED.rate`,
      [year, rate]
    );
    updated++;
  }
  return updated;
}

module.exports = { pool, initInflationTable, refreshFromEurostat };