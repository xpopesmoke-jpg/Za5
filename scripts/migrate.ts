import { migrateDb } from "../src/db/setup";

migrateDb()
  .then(() => {
    console.log("Database is up to date.");
  })
  .catch((err) => {
    console.error("Database migration failed:", err);
    process.exit(1);
  });
