import { describe, expect, it } from "vitest";
import { SpecError } from "../src/domain/rules.js";
import * as service from "../src/service.js";
import { demoStore } from "./helpers.js";

const trial = {
  teacherId: 1,
  courseTypeId: 1,
  timeRange: "周六 10:00-11:00",
  studentName: "小周",
  gender: "男",
  birthDate: "2016-03-03",
  phone: "13900000000",
  parentPhone: "13900000001",
  bought: false,
  remark: "再考虑一下",
  plannedEnrollDate: "",
};

describe("服务规格", () => {
  it("SPEC-AUTH-02 顾问账号不能作为教师登录", async () => {
    const { store } = await demoStore();
    await expect(service.login(store, { account: "advisor", password: "advisor123", role: "teacher" })).rejects.toMatchObject({
      code: "SPEC-AUTH-01",
    });
    const user = await service.login(store, { account: "advisor", password: "advisor123", role: "advisor" });
    expect(user.role).toBe("advisor");
  });

  it("未买课可以不填备注", async () => {
    const { store, advisor } = await demoStore();
    const created = await service.createTrial(store, advisor, { ...trial, remark: "" });
    expect(created.bought).toBe(false);
    expect(created.remark).toBe("");
  });

  it("SPEC-TRIAL-03 试听课程必须和教师一致", async () => {
    const { store, advisor } = await demoStore();
    await expect(service.createTrial(store, advisor, { ...trial, courseTypeId: 2 })).rejects.toMatchObject({ code: "SPEC-TRIAL-03" });
  });

  it("SPEC-TRIAL-02 顾问可以之后把试听改为已买课", async () => {
    const { store, advisor } = await demoStore();
    const created = await service.createTrial(store, advisor, trial);
    const updated = await service.updateTrial(store, advisor, created.id, { ...trial, bought: true, remark: "" });
    expect(updated.bought).toBe(true);
    expect(updated.studentName).toBe("小周");
  });

  it("顾问可以登记回访和 AI 助力，并删除回访", async () => {
    const { store, advisor, teacher } = await demoStore();
    const created = await service.createTrial(store, advisor, trial);
    await expect(service.createTrialVisit(store, teacher, created.id, { content: "电话未接" })).rejects.toMatchObject({
      code: "SPEC-PERM-01",
    });
    await expect(service.createTrialVisit(store, advisor, created.id, { content: "  " })).rejects.toMatchObject({
      code: "SPEC-TRIAL-04",
    });
    await expect(service.generateTrialAssist(store, advisor, created.id, async () => "不会调用")).rejects.toMatchObject({
      code: "SPEC-TRIAL-05",
    });
    await service.createTrialVisit(store, advisor, created.id, { content: "家长下周再定" });
    const saved = await service.generateTrialAssist(store, advisor, created.id, async (prompt) => {
      expect(prompt).toContain("小周");
      expect(prompt).toContain("钢琴");
      expect(prompt).toContain("家长下周再定");
      expect(prompt).toContain("家长沟通建议");
      return "建议强调试听反馈";
    });
    expect(saved.content).toBe("建议强调试听反馈");
    const page = await service.listTrialFollowUps(store, advisor, created.id);
    expect(page.studentName).toBe("小周");
    expect(page.courseTypeName).toBe("钢琴");
    expect(page.latestAssist).toBe("建议强调试听反馈");
    expect(page.visits.map((item) => item.content)).toEqual(["家长下周再定"]);
    expect(page.assists.map((item) => item.content)).toEqual(["建议强调试听反馈"]);
    await service.deleteTrialVisit(store, advisor, created.id, page.visits[0].id);
    const after = await service.listTrialFollowUps(store, advisor, created.id);
    expect(after.visits).toHaveLength(0);
    expect(after.assists).toHaveLength(1);
  });

  it("已买课或教师不能生成回访建议", async () => {
    const { store, advisor, teacher } = await demoStore();
    const created = await service.createTrial(store, advisor, { ...trial, bought: true, remark: "" });
    await service.createTrialVisit(store, advisor, created.id, { content: "已经报名" });
    await expect(service.generateTrialAssist(store, teacher, created.id, async () => "不会调用")).rejects.toMatchObject({
      code: "SPEC-PERM-01",
    });
    await expect(service.generateTrialAssist(store, advisor, created.id, async () => "不会调用")).rejects.toMatchObject({
      code: "SPEC-TRIAL-05",
      message: "已买课，无需生成回访建议",
    });
  });

  it("SPEC-HOUR-01 课时必须是正整数", async () => {
    const { store, advisor } = await demoStore();
    const student = await service.createStudent(store, advisor, {
      name: "小周", gender: "男", birthDate: "2016-03-03", grade: "三年级", phone: "1", parentPhone: "2",
    });
    await expect(
      service.createPurchase(store, advisor, { studentId: student.id, amount: 100, courseTypeId: 1, hours: 0 }),
    ).rejects.toMatchObject({ code: "SPEC-HOUR-01" });
  });

  it("SPEC-CLASS-03 教师课程类型必须和班级一致", async () => {
    const { store, advisor } = await demoStore();
    await expect(service.createClass(store, advisor, { name: "美术A", teacherId: 1, courseTypeId: 2 })).rejects.toMatchObject({
      code: "SPEC-CLASS-03",
    });
  });

  it("SPEC-CLASS-01 没买该课程不能分班", async () => {
    const { store, advisor } = await demoStore();
    const student = await service.createStudent(store, advisor, {
      name: "小周", gender: "男", birthDate: "2016-03-03", grade: "三年级", phone: "1", parentPhone: "2",
    });
    const classGroup = await service.createClass(store, advisor, { name: "钢琴A", teacherId: 1, courseTypeId: 1 });
    await expect(service.assignStudent(store, advisor, classGroup.id, student.id)).rejects.toMatchObject({ code: "SPEC-CLASS-01" });
  });

  it("SPEC-CLASS-02 一个学生只能在一个班", async () => {
    const { store, advisor } = await demoStore();
    const student = await service.createStudent(store, advisor, {
      name: "小周", gender: "男", birthDate: "2016-03-03", grade: "三年级", phone: "1", parentPhone: "2",
    });
    await service.createPurchase(store, advisor, { studentId: student.id, amount: 800, courseTypeId: 1, hours: 4 });
    const first = await service.createClass(store, advisor, { name: "钢琴A", teacherId: 1, courseTypeId: 1 });
    const second = await service.createClass(store, advisor, { name: "钢琴B", teacherId: 1, courseTypeId: 1 });
    await service.assignStudent(store, advisor, first.id, student.id);
    await expect(service.assignStudent(store, advisor, second.id, student.id)).rejects.toMatchObject({ code: "SPEC-CLASS-02" });
  });

  it("SPEC-SESSION-01 教师不能给别人的班建课时", async () => {
    const { store, advisor, teacher } = await demoStore();
    const classGroup = await service.createClass(store, advisor, { name: "钢琴A", teacherId: 1, courseTypeId: 1 });
    await expect(
      service.createSession(store, { ...teacher, id: 99 }, classGroup.id, {
        weekday: "周六", sessionDate: "2026-11-14", timeRange: "10:00-11:00", topic: "音阶", remark: "",
      }),
    ).rejects.toMatchObject({ code: "SPEC-SESSION-01" });
  });

  it("SPEC-SESSION-02 请假课时不能签到，已签到不能改成请假", async () => {
    const { store, advisor, teacher } = await demoStore();
    const student = await service.createStudent(store, advisor, {
      name: "小周", gender: "男", birthDate: "2016-03-03", grade: "三年级", phone: "1", parentPhone: "2",
    });
    await service.createPurchase(store, advisor, { studentId: student.id, amount: 800, courseTypeId: 1, hours: 4 });
    const classGroup = await service.createClass(store, advisor, { name: "钢琴A", teacherId: 1, courseTypeId: 1 });
    await service.assignStudent(store, advisor, classGroup.id, student.id);
    const session = await service.createSession(store, teacher, classGroup.id, {
      weekday: "周六", sessionDate: "2026-11-14", timeRange: "10:00-11:00", topic: "音阶", remark: "",
    });
    await service.updateSession(store, teacher, session.id, { status: "教师请假" });
    await expect(
      service.submitAttendance(store, teacher, session.id, [{ studentId: student.id, status: "未到", remark: "" }]),
    ).rejects.toMatchObject({ code: "SPEC-SESSION-02" });
    const another = await service.createSession(store, teacher, classGroup.id, {
      weekday: "周六", sessionDate: "2026-11-21", timeRange: "10:00-11:00", topic: "练习", remark: "",
    });
    await service.submitAttendance(store, teacher, another.id, [{ studentId: student.id, status: "已到", remark: "认真" }]);
    await expect(service.updateSession(store, teacher, another.id, { status: "教师请假" })).rejects.toMatchObject({
      code: "SPEC-SESSION-02",
    });
  });

  it("未买课的试听学生可以登记消费，并变为已买课", async () => {
    const { store, advisor } = await demoStore();
    const created = await service.createTrial(store, advisor, { ...trial, studentName: "小陈", phone: "13800138000" });
    await expect(
      service.createPurchase(store, advisor, { trialId: created.id, amount: 1.5, courseTypeId: 2, hours: 4 }),
    ).rejects.toMatchObject({ code: "SPEC-HOUR-01" });
    const purchase = await service.createPurchase(store, advisor, { trialId: created.id, amount: 800, courseTypeId: 2, hours: 4 });
    expect(purchase.studentId).toBeGreaterThan(0);
    expect(purchase.courseTypeId).toBe(created.courseTypeId);
    expect(purchase.amount).toBe(800);
    const students = await service.listStudents(store, advisor);
    expect(students.some((item) => item.name === "小陈" && item.phone === "13800138000")).toBe(true);
    const trials = await service.listTrials(store, advisor);
    expect(trials.find((item) => item.id === created.id)?.bought).toBe(true);
    await expect(
      service.createPurchase(store, advisor, { trialId: created.id, amount: 100, courseTypeId: 1, hours: 1 }),
    ).rejects.toMatchObject({ code: "SPEC-HOUR-01" });
  });

  it("SPEC-STUDENT-01 已分班的学生不能删除", async () => {
    const { store, advisor } = await demoStore();
    const student = await service.createStudent(store, advisor, {
      name: "小周", gender: "男", birthDate: "2016-03-03", grade: "三年级", phone: "1", parentPhone: "2",
    });
    await service.createPurchase(store, advisor, { studentId: student.id, amount: 800, courseTypeId: 1, hours: 4 });
    const classGroup = await service.createClass(store, advisor, { name: "钢琴A", teacherId: 1, courseTypeId: 1 });
    await service.assignStudent(store, advisor, classGroup.id, student.id);
    await expect(service.deleteStudent(store, advisor, student.id)).rejects.toMatchObject({ code: "SPEC-STUDENT-01" });
  });

  it("SPEC-FLOW-01 从试听到续费，教师不能代替顾问建学生", async () => {
    const { store, advisor, teacher } = await demoStore();
    await expect(
      service.createStudent(store, teacher, {
        name: "小周", gender: "男", birthDate: "2016-03-03", grade: "三年级", phone: "1", parentPhone: "2",
      }),
    ).rejects.toBeInstanceOf(SpecError);

    const created = await service.createTrial(store, advisor, trial);
    await service.updateTrial(store, advisor, created.id, { ...trial, bought: true });
    const student = await service.createStudent(store, advisor, {
      name: "小周", gender: "男", birthDate: "2016-03-03", grade: "三年级", phone: "1", parentPhone: "2",
    });
    await service.createPurchase(store, advisor, { studentId: student.id, amount: 1600, courseTypeId: 1, hours: 4 });
    const classGroup = await service.createClass(store, advisor, { name: "钢琴A", teacherId: 1, courseTypeId: 1 });
    await service.assignStudent(store, advisor, classGroup.id, student.id);
    const first = await service.createSession(store, teacher, classGroup.id, {
      weekday: "周六", sessionDate: "2026-11-14", timeRange: "10:00-11:00", topic: "音阶", remark: "",
    });
    const before = await service.attendanceSheet(store, teacher, first.id);
    expect(before.students[0].isNew).toBe(true);
    await service.submitAttendance(store, teacher, first.id, [{ studentId: student.id, status: "已到", remark: "节奏稳" }]);
    const second = await service.createSession(store, teacher, classGroup.id, {
      weekday: "周六", sessionDate: "2026-11-21", timeRange: "10:00-11:00", topic: "练习", remark: "",
    });
    await service.submitAttendance(store, teacher, second.id, [{ studentId: student.id, status: "已到", remark: "" }]);
    const mid = (await service.listStudents(store, advisor)).find((item) => item.id === student.id);
    expect(mid).toMatchObject({ completedHours: 2, remainingHours: 2, low: true });
    expect((await service.attendanceSheet(store, teacher, second.id)).students[0].isNew).toBe(false);

    await service.createPurchase(store, advisor, { studentId: student.id, amount: 800, courseTypeId: 1, hours: 2 });
    const after = (await service.listStudents(store, advisor)).find((item) => item.id === student.id);
    expect(after).toMatchObject({ remainingHours: 4, low: false });
  });
});
