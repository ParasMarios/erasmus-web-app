const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "erasmus_db",
  password: "1235",
  port: 5432,
});

module.exports = pool;
