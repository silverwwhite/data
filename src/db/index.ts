import Database from "better-sqlite3";

async function initializeDatabase() {
  const opion = { verbose: console.log };
  const db = new Database("app.db", opion);
  return db;
}

const db = await initializeDatabase();

export default db;