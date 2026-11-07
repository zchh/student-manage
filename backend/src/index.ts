import { createMysqlStore } from "./db/mysql.js";
import { createApp } from "./http.js";
import { createMemoryStore } from "./store/memory.js";
import { seedDemo } from "./store/seed.js";
import type { Store } from "./store/types.js";

async function openStore(): Promise<Store> {
  if (process.env.USE_MEMORY === "1" || !process.env.MYSQL_HOST) {
    return createMemoryStore();
  }
  let last: unknown;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      return await createMysqlStore();
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw last;
}

const store = await openStore();
await seedDemo(store);
const port = Number(process.env.PORT ?? 4000);
createApp(store).listen(port, () => {
  console.log(`api listening on ${port}`);
});
