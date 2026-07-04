import { pgTable } from "drizzle-orm/pg-core";
pgTable("dummy_table", (t) => {
  console.log("t properties:", Object.getOwnPropertyNames(t));
  console.log("t.integer:", typeof t.integer);
  console.log("t.int:", typeof (t as any).int);
  return {};
});
