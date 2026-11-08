import { describe, expect, it } from "vitest";
import { dateForWeekday, seedBulk } from "../src/store/bulk-seed.js";
import { createMemoryStore } from "../src/store/memory.js";
import { seedDemo } from "../src/store/seed.js";

describe("测试数据", () => {
  it("平均分配顾问、教师和每周上课时间", async () => {
    const store = createMemoryStore();
    await seedDemo(store);
    const result = await seedBulk(store, () => 0.3);
    expect(result?.studentCount).toBe(300);
    expect(result?.advisors.map((item) => item.account)).toEqual(["advisor01", "advisor02", "advisor03"]);
    expect(new Set(result?.teachers.map((item) => item.account)).size).toBe(5);
    expect(new Set(result?.classes.map((item) => item.name)).size).toBe(5);
    expect(new Set(result?.classes.map((item) => `${item.weekday} ${item.timeRange}`)).size).toBe(5);

    const students = await store.students();
    expect(new Set(students.map((item) => item.studentNo)).size).toBe(300);
    const links = await store.links();
    for (const advisor of (await store.advisors()).filter((item) => item.account.startsWith("advisor0"))) {
      expect(links.filter((item) => item.advisorId === advisor.id)).toHaveLength(100);
    }
    const members = await store.classStudents();
    for (const classGroup of await store.classes()) {
      expect(members.filter((item) => item.classId === classGroup.id)).toHaveLength(60);
    }
    const sessions = await store.sessions();
    expect(sessions).toHaveLength(5);
    for (const session of sessions) {
      expect(dateForWeekday(session.weekday)).toBe(session.sessionDate);
    }
    expect(await seedBulk(store)).toBeNull();
    expect(await store.students()).toHaveLength(300);
  });
});