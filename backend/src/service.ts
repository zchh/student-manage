import bcrypt from "bcryptjs";
import {
  assertCanAttend,
  assertNotBoughtRemark,
  assertRole,
  isNewStudent,
  lessonBalance,
  SpecError,
} from "./domain/rules.js";
import type {
  Actor,
  AttendStatus,
  Role,
  SessionStatus,
  Trial,
} from "./domain/types.js";
import type { Store } from "./store/types.js";

function audit(store: Store, actor: Actor | null) {
  const now = store.now();
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: actor?.id ?? null,
    updatedBy: actor?.id ?? null,
  };
}

function touch(store: Store, actor: Actor) {
  return { updatedAt: store.now(), updatedBy: actor.id };
}

async function hoursOf(store: Store, studentId: number, courseTypeId: number | null) {
  const purchases = await store.purchases();
  const sessions = await store.sessions();
  const attendances = await store.attendances();
  const purchased = purchases
    .filter((item) => item.studentId === studentId && (courseTypeId === null || item.courseTypeId === courseTypeId))
    .reduce((sum, item) => sum + item.hours, 0);
  const sessionIds = new Set(
    sessions
      .filter((item) => courseTypeId === null || item.courseTypeId === courseTypeId)
      .map((item) => item.id),
  );
  const completed = attendances.filter(
    (item) => item.studentId === studentId && item.status === "已到" && sessionIds.has(item.sessionId),
  ).length;
  return lessonBalance(purchased, completed);
}

async function requireClass(store: Store, classId: number) {
  const found = (await store.classes()).find((item) => item.id === classId);
  if (!found) throw new SpecError("SPEC-CLASS-01", "班级不存在", 404);
  return found;
}

function ownClass(actor: Actor, teacherId: number) {
  if (actor.role !== "teacher" || actor.id !== teacherId) {
    throw new SpecError("SPEC-SESSION-01", "只能操作自己的班级", 403);
  }
}

export async function login(
  store: Store,
  input: { account: string; password: string; role: Role },
) {
  const rows = input.role === "advisor" ? await store.advisors() : await store.teachers();
  const user = rows.find((item) => item.account === input.account);
  if (!user || !bcrypt.compareSync(input.password, user.passwordHash)) {
    throw new SpecError("SPEC-AUTH-01", "账号或密码不正确", 401);
  }
  return { id: user.id, role: input.role, name: user.name };
}

export async function listCourseTypes(store: Store, actor: Actor) {
  if (actor.role !== "advisor" && actor.role !== "teacher") {
    throw new SpecError("SPEC-AUTH-01", "未登录", 401);
  }
  return store.courseTypes();
}

export async function listTeachers(store: Store, actor: Actor) {
  assertRole(actor.role, "advisor");
  const types = await store.courseTypes();
  return (await store.teachers()).map(({ passwordHash: _password, ...teacher }) => ({
    ...teacher,
    courseTypeName: types.find((item) => item.id === teacher.courseTypeId)?.name ?? "",
  }));
}

function trialInput(input: Omit<Trial, "id" | "advisorId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">) {
  assertNotBoughtRemark(input.bought, input.remark);
  return input;
}

export async function createTrial(
  store: Store,
  actor: Actor,
  input: Omit<Trial, "id" | "advisorId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">,
) {
  assertRole(actor.role, "advisor");
  const body = trialInput(input);
  const teacher = (await store.teachers()).find((item) => item.id === body.teacherId);
  if (!teacher || teacher.courseTypeId !== body.courseTypeId) {
    throw new SpecError("SPEC-TRIAL-03", "试听课程类型必须与教师一致");
  }
  return store.insertTrial({ ...body, advisorId: actor.id, ...audit(store, actor) });
}

export async function updateTrial(
  store: Store,
  actor: Actor,
  id: number,
  input: Omit<Trial, "id" | "advisorId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">,
) {
  assertRole(actor.role, "advisor");
  const current = (await store.trials()).find((item) => item.id === id);
  if (!current) throw new SpecError("SPEC-TRIAL-02", "试听课不存在", 404);
  const body = trialInput(input);
  const teacher = (await store.teachers()).find((item) => item.id === body.teacherId);
  if (!teacher || teacher.courseTypeId !== body.courseTypeId) {
    throw new SpecError("SPEC-TRIAL-03", "试听课程类型必须与教师一致");
  }
  return store.updateTrial({
    ...current,
    ...body,
    ...touch(store, actor),
  });
}

export async function listTrials(store: Store, actor: Actor) {
  assertRole(actor.role, "advisor");
  const [trials, advisors, teachers, types] = await Promise.all([
    store.trials(),
    store.advisors(),
    store.teachers(),
    store.courseTypes(),
  ]);
  return trials.map((trial) => ({
    ...trial,
    advisorName: advisors.find((item) => item.id === trial.advisorId)?.name ?? "",
    teacherName: teachers.find((item) => item.id === trial.teacherId)?.name ?? "",
    courseTypeName: types.find((item) => item.id === trial.courseTypeId)?.name ?? "",
  }));
}

export async function createStudent(
  store: Store,
  actor: Actor,
  input: { name: string; gender: string; birthDate: string; grade: string; phone: string; parentPhone: string },
) {
  assertRole(actor.role, "advisor");
  const count = (await store.students()).length + 1;
  const student = await store.insertStudent({
    ...input,
    studentNo: `S${String(count).padStart(4, "0")}`,
    ...audit(store, actor),
  });
  await store.insertLink({ advisorId: actor.id, studentId: student.id, ...audit(store, actor) });
  return student;
}

export async function listStudents(store: Store, actor: Actor, keyword = "") {
  assertRole(actor.role, "advisor");
  const [students, classes, members, teachers, links, advisors] = await Promise.all([
    store.students(),
    store.classes(),
    store.classStudents(),
    store.teachers(),
    store.links(),
    store.advisors(),
  ]);
  const text = keyword.trim();
  const rows = [];
  for (const student of students) {
    if (text && !student.name.includes(text) && !student.studentNo.includes(text)) continue;
    const membership = members.find((item) => item.studentId === student.id);
    const classGroup = classes.find((item) => item.id === membership?.classId);
    const teacher = teachers.find((item) => item.id === classGroup?.teacherId);
    const balance = await hoursOf(store, student.id, classGroup?.courseTypeId ?? null);
    const link = links.find((item) => item.studentId === student.id);
    rows.push({
      ...student,
      classId: classGroup?.id ?? null,
      className: classGroup?.name ?? "",
      teacherId: teacher?.id ?? null,
      teacherName: teacher?.name ?? "",
      advisorId: link?.advisorId ?? null,
      advisorName: advisors.find((item) => item.id === link?.advisorId)?.name ?? "",
      completedHours: balance.completed,
      remainingHours: balance.remaining,
      low: balance.low,
    });
  }
  return rows;
}

export async function deleteStudent(store: Store, actor: Actor, id: number) {
  assertRole(actor.role, "advisor");
  const placed = (await store.classStudents()).some((item) => item.studentId === id);
  const signed = (await store.attendances()).some((item) => item.studentId === id);
  if (placed || signed) throw new SpecError("SPEC-STUDENT-01", "已分班或已签到的学生不能删除");
  await store.deleteStudent(id);
}

export async function createPurchase(
  store: Store,
  actor: Actor,
  input: { studentId: number; amount: number; courseTypeId: number; hours: number },
) {
  assertRole(actor.role, "advisor");
  if (!Number.isInteger(input.hours) || input.hours <= 0) {
    throw new SpecError("SPEC-HOUR-01", "课时必须是正整数");
  }
  const student = (await store.students()).find((item) => item.id === input.studentId);
  if (!student) throw new SpecError("SPEC-HOUR-01", "学生不存在", 404);
  return store.insertPurchase({ ...input, advisorId: actor.id, ...audit(store, actor) });
}

export async function listPurchases(store: Store, actor: Actor, keyword = "") {
  assertRole(actor.role, "advisor");
  const [purchases, students, advisors, types] = await Promise.all([
    store.purchases(),
    store.students(),
    store.advisors(),
    store.courseTypes(),
  ]);
  return purchases
    .map((purchase) => {
      const student = students.find((item) => item.id === purchase.studentId);
      return {
        ...purchase,
        studentName: student?.name ?? "",
        advisorName: advisors.find((item) => item.id === purchase.advisorId)?.name ?? "",
        courseTypeName: types.find((item) => item.id === purchase.courseTypeId)?.name ?? "",
      };
    })
    .filter((item) => !keyword.trim() || item.studentName.includes(keyword.trim()));
}

export async function createClass(
  store: Store,
  actor: Actor,
  input: { name: string; teacherId: number; courseTypeId: number },
) {
  assertRole(actor.role, "advisor");
  const teacher = (await store.teachers()).find((item) => item.id === input.teacherId);
  if (!teacher || teacher.courseTypeId !== input.courseTypeId) {
    throw new SpecError("SPEC-CLASS-03", "教师课程类型与班级不一致");
  }
  return store.insertClass({ ...input, ...audit(store, actor) });
}

export async function listClasses(store: Store, actor: Actor) {
  assertRole(actor.role, "advisor");
  const [classes, teachers, types, members] = await Promise.all([
    store.classes(),
    store.teachers(),
    store.courseTypes(),
    store.classStudents(),
  ]);
  return classes.map((item) => {
    const teacher = teachers.find((row) => row.id === item.teacherId);
    return {
      ...item,
      courseTypeName: types.find((row) => row.id === item.courseTypeId)?.name ?? "",
      teacherName: teacher?.name ?? "",
      teacherAvatar: teacher?.avatar ?? "",
      teacherGender: teacher?.gender ?? "",
      studentCount: members.filter((row) => row.classId === item.id).length,
    };
  });
}

export async function assignStudent(store: Store, actor: Actor, classId: number, studentId: number) {
  assertRole(actor.role, "advisor");
  const classGroup = await requireClass(store, classId);
  const purchased = (await store.purchases())
    .filter((item) => item.studentId === studentId && item.courseTypeId === classGroup.courseTypeId)
    .reduce((sum, item) => sum + item.hours, 0);
  if (purchased <= 0) throw new SpecError("SPEC-CLASS-01", "学生尚未购买该班课程，不能分班");
  if ((await store.classStudents()).some((item) => item.studentId === studentId)) {
    throw new SpecError("SPEC-CLASS-02", "学生已经在班级中");
  }
  await store.insertClassStudent({ classId, studentId, ...audit(store, actor) });
}

export async function listClassSessions(store: Store, actor: Actor, classId: number) {
  assertRole(actor.role, "advisor");
  return (await store.sessions()).filter((item) => item.classId === classId);
}

export async function listTeacherClasses(store: Store, actor: Actor) {
  assertRole(actor.role, "teacher");
  const types = await store.courseTypes();
  return (await store.classes())
    .filter((item) => item.teacherId === actor.id)
    .map((item) => ({
      ...item,
      courseTypeName: types.find((row) => row.id === item.courseTypeId)?.name ?? "",
      teacherName: actor.name,
    }));
}

export async function listTeacherStudents(store: Store, actor: Actor, classId: number) {
  assertRole(actor.role, "teacher");
  const classGroup = await requireClass(store, classId);
  ownClass(actor, classGroup.teacherId);
  const members = (await store.classStudents()).filter((item) => item.classId === classId);
  const students = await store.students();
  const links = await store.links();
  const advisors = await store.advisors();
  const rows = [];
  for (const member of members) {
    const student = students.find((item) => item.id === member.studentId);
    if (!student) continue;
    const balance = await hoursOf(store, student.id, classGroup.courseTypeId);
    const link = links.find((item) => item.studentId === student.id);
    rows.push({
      ...student,
      advisorId: link?.advisorId ?? null,
      advisorName: advisors.find((item) => item.id === link?.advisorId)?.name ?? "",
      completedHours: balance.completed,
      remainingHours: balance.remaining,
      low: balance.low,
    });
  }
  return rows;
}

export async function createSession(
  store: Store,
  actor: Actor,
  classId: number,
  input: { weekday: string; sessionDate: string; timeRange: string; topic: string; remark: string },
) {
  assertRole(actor.role, "teacher");
  const classGroup = await requireClass(store, classId);
  ownClass(actor, classGroup.teacherId);
  return store.insertSession({
    ...input,
    classId,
    teacherId: actor.id,
    courseTypeId: classGroup.courseTypeId,
    status: "待上课",
    ...audit(store, actor),
  });
}

export async function listSessions(store: Store, actor: Actor, classId: number) {
  assertRole(actor.role, "teacher");
  const classGroup = await requireClass(store, classId);
  ownClass(actor, classGroup.teacherId);
  return (await store.sessions()).filter((item) => item.classId === classId);
}

export async function updateSession(
  store: Store,
  actor: Actor,
  sessionId: number,
  input: { status: SessionStatus; remark?: string },
) {
  assertRole(actor.role, "teacher");
  const session = (await store.sessions()).find((item) => item.id === sessionId);
  if (!session) throw new SpecError("SPEC-SESSION-02", "课时不存在", 404);
  ownClass(actor, session.teacherId);
  if (input.status === "教师请假" && (await store.attendances()).some((item) => item.sessionId === sessionId)) {
    throw new SpecError("SPEC-SESSION-02", "已有签到记录，不能改为请假");
  }
  return store.updateSession({
    ...session,
    status: input.status,
    remark: input.remark ?? session.remark,
    ...touch(store, actor),
  });
}

export async function attendanceSheet(store: Store, actor: Actor, sessionId: number) {
  assertRole(actor.role, "teacher");
  const session = (await store.sessions()).find((item) => item.id === sessionId);
  if (!session) throw new SpecError("SPEC-ATTEND-01", "课时不存在", 404);
  const classGroup = await requireClass(store, session.classId);
  ownClass(actor, session.teacherId);
  const teacher = (await store.teachers()).find((item) => item.id === session.teacherId);
  const course = (await store.courseTypes()).find((item) => item.id === session.courseTypeId);
  const members = (await store.classStudents()).filter((item) => item.classId === session.classId);
  const students = await store.students();
  const marks = (await store.attendances()).filter((item) => item.sessionId === sessionId);
  const items = [];
  for (const member of members) {
    const student = students.find((item) => item.id === member.studentId);
    if (!student) continue;
    const balance = await hoursOf(store, student.id, session.courseTypeId);
    const mark = marks.find((item) => item.studentId === student.id);
    items.push({
      studentId: student.id,
      studentName: student.name,
      studentNo: student.studentNo,
      isNew: isNewStudent(balance.completed - (mark?.status === "已到" ? 1 : 0)),
      status: mark?.status ?? "",
      remainingHours: balance.remaining,
      low: balance.low,
      remark: mark?.remark ?? "",
    });
  }
  return {
    className: classGroup.name,
    teacherId: teacher?.id ?? session.teacherId,
    teacherName: teacher?.name ?? "",
    courseTypeName: course?.name ?? "",
    weekday: session.weekday,
    timeRange: session.timeRange,
    sessionDate: session.sessionDate,
    status: session.status,
    students: items,
  };
}

export async function submitAttendance(
  store: Store,
  actor: Actor,
  sessionId: number,
  items: { studentId: number; status: AttendStatus; remark: string }[],
) {
  assertRole(actor.role, "teacher");
  const session = (await store.sessions()).find((item) => item.id === sessionId);
  if (!session) throw new SpecError("SPEC-HOUR-02", "课时不存在", 404);
  ownClass(actor, session.teacherId);
  if (session.status === "教师请假") throw new SpecError("SPEC-SESSION-02", "教师请假的课时不能签到");
  const members = new Set(
    (await store.classStudents()).filter((item) => item.classId === session.classId).map((item) => item.studentId),
  );
  for (const item of items) {
    if (!members.has(item.studentId)) throw new SpecError("SPEC-HOUR-02", "学生不在该班级");
    const sessions = (await store.sessions()).filter((row) => row.courseTypeId === session.courseTypeId);
    const sessionIds = new Set(sessions.map((row) => row.id));
    const consumed = (await store.attendances()).filter(
      (row) =>
        row.studentId === item.studentId &&
        row.status === "已到" &&
        row.sessionId !== sessionId &&
        sessionIds.has(row.sessionId),
    ).length;
    const purchased = (await store.purchases())
      .filter((row) => row.studentId === item.studentId && row.courseTypeId === session.courseTypeId)
      .reduce((sum, row) => sum + row.hours, 0);
    assertCanAttend(purchased, consumed, item.status);
    const existing = (await store.attendances()).find(
      (row) => row.sessionId === sessionId && row.studentId === item.studentId,
    );
    if (existing) {
      await store.updateAttendance({ ...existing, status: item.status, remark: item.remark, ...touch(store, actor) });
    } else {
      await store.insertAttendance({
        sessionId,
        studentId: item.studentId,
        status: item.status,
        remark: item.remark,
        ...audit(store, actor),
      });
    }
  }
  if (session.status === "待上课") {
    await store.updateSession({ ...session, status: "已完成", ...touch(store, actor) });
  }
}
