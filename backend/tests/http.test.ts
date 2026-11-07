import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/http.js";
import { demoStore } from "./helpers.js";

async function tokenFor(app: ReturnType<typeof createApp>, account: string, password: string, role: string) {
  const response = await request(app).post("/api/auth/login").send({ account, password, role });
  return response.body.token as string;
}

describe("HTTP 权限", () => {
  it("SPEC-AUTH-01 密码错误不签发令牌", async () => {
    const { store } = await demoStore();
    const response = await request(createApp(store)).post("/api/auth/login").send({
      account: "advisor",
      password: "wrong",
      role: "advisor",
    });
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("SPEC-AUTH-01");
    expect(response.body.token).toBeUndefined();
  });

  it("SPEC-PERM-01 教师不能调用顾问的写接口", async () => {
    const { store } = await demoStore();
    const app = createApp(store);
    const token = await tokenFor(app, "teacher", "teacher123", "teacher");
    const response = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "小周", gender: "男", birthDate: "2016-03-03", grade: "三年级", phone: "1", parentPhone: "2" });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("SPEC-PERM-01");
    expect(await store.students()).toHaveLength(0);
  });

  it("SPEC-PERM-02 顾问不能调用教师的课时接口", async () => {
    const { store } = await demoStore();
    const app = createApp(store);
    const token = await tokenFor(app, "advisor", "advisor123", "advisor");
    const response = await request(app)
      .post("/api/teacher/classes/1/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ weekday: "周六", sessionDate: "2026-11-14", timeRange: "10:00-11:00", topic: "音阶", remark: "" });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("SPEC-PERM-02");
    expect(await store.sessions()).toHaveLength(0);
  });

  it("SPEC-TRIAL-01 接口拒绝没有原因的未买课记录", async () => {
    const { store } = await demoStore();
    const app = createApp(store);
    const token = await tokenFor(app, "advisor", "advisor123", "advisor");
    const response = await request(app)
      .post("/api/trials")
      .set("Authorization", `Bearer ${token}`)
      .send({
        teacherId: 1,
        courseTypeId: 1,
        timeRange: "周六 10:00-11:00",
        studentName: "小周",
        gender: "男",
        birthDate: "2016-03-03",
        phone: "1",
        parentPhone: "2",
        bought: false,
        remark: "",
        plannedEnrollDate: "",
      });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("SPEC-TRIAL-01");
  });
});
