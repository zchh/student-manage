import type { Actor } from "../src/domain/types.js";
import { createMemoryStore } from "../src/store/memory.js";
import { seedDemo } from "../src/store/seed.js";
import type { Store } from "../src/store/types.js";

export async function demoStore() {
  const store = createMemoryStore();
  await seedDemo(store);
  const advisor: Actor = { id: 1, role: "advisor", name: "王顾问" };
  const teacher: Actor = { id: 1, role: "teacher", name: "李老师" };
  return { store, advisor, teacher };
}

export type Demo = Awaited<ReturnType<typeof demoStore>>;
export type { Store };
