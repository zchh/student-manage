import bcrypt from "bcryptjs";
import type { Store } from "./types.js";

export async function seedDemo(store: Store): Promise<void> {
  if ((await store.advisors()).length > 0) return;
  const now = store.now();
  const audit = { createdAt: now, updatedAt: now, createdBy: null, updatedBy: null };
  await store.insertCourseType({ ...audit, name: "钢琴" });
  await store.insertCourseType({ ...audit, name: "美术" });
  await store.insertAdvisor({
    ...audit,
    name: "王顾问",
    avatar: "",
    gender: "女",
    birthDate: "1990-01-01",
    phone: "13800000001",
    account: "advisor",
    passwordHash: bcrypt.hashSync("advisor123", 8),
  });
  await store.insertTeacher({
    ...audit,
    name: "李老师",
    avatar: "",
    gender: "男",
    birthDate: "1988-05-05",
    phone: "13800000002",
    courseTypeId: 1,
    account: "teacher",
    passwordHash: bcrypt.hashSync("teacher123", 8),
  });
}
