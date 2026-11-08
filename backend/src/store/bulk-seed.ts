import bcrypt from "bcryptjs";
import type { Store } from "./types.js";

const ADVISOR_COUNT = 3;
const TEACHER_COUNT = 5;
const STUDENT_COUNT = 300;
const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;
const TIME_RANGES = ["09:00-10:00", "10:00-11:00", "14:00-15:00", "16:00-17:00", "19:00-20:00"];
const SURNAMES = ["张", "李", "王", "赵", "陈", "刘", "杨", "黄", "周", "吴", "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "罗"];
const GIVEN_NAMES = ["一诺", "子轩", "浩然", "欣怡", "诗涵", "梓涵", "宇轩", "欣妍", "博文", "雨桐", "俊杰", "思远", "可馨", "子墨", "浩宇"];
const GRADES = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];

export interface BulkClassSlot {
  name: string;
  weekday: string;
  timeRange: string;
  studentCount: number;
}

export interface BulkSeedResult {
  advisors: { account: string; name: string }[];
  teachers: { account: string; name: string }[];
  classes: BulkClassSlot[];
  studentCount: number;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function dateForWeekday(weekday: string, today = new Date()): string {
  const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const target = labels.indexOf(weekday);
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  date.setDate(date.getDate() + (target - date.getDay()));
  return localDate(date);
}

function studentName(index: number): string {
  return `${SURNAMES[index % SURNAMES.length]}${GIVEN_NAMES[Math.floor(index / SURNAMES.length)]}`;
}

export async function seedBulk(store: Store, random: () => number = Math.random): Promise<BulkSeedResult | null> {
  if ((await store.advisors()).some((item) => item.account === "advisor01")) return null;

  const now = store.now();
  const audit = { createdAt: now, updatedAt: now, createdBy: null, updatedBy: null };
  for (const name of ["钢琴", "美术"]) {
    if (!(await store.courseTypes()).some((item) => item.name === name)) {
      await store.insertCourseType({ ...audit, name });
    }
  }
  const types = await store.courseTypes();
  const piano = types.find((item) => item.name === "钢琴");
  const art = types.find((item) => item.name === "美术");
  if (!piano || !art) throw new Error("缺少课程类型");

  const advisorPassword = bcrypt.hashSync("advisor123", 8);
  const teacherPassword = bcrypt.hashSync("teacher123", 8);
  const advisorNames = ["周顾问", "吴顾问", "郑顾问"];
  const teacherNames = ["陈老师", "林老师", "何老师", "高老师", "罗老师"];
  const advisors = [];
  for (let index = 0; index < ADVISOR_COUNT; index += 1) {
    advisors.push(await store.insertAdvisor({
      ...audit,
      name: advisorNames[index],
      avatar: "",
      gender: index % 2 === 0 ? "女" : "男",
      birthDate: `199${index}-03-0${index + 1}`,
      phone: `1380000100${index + 1}`,
      account: `advisor0${index + 1}`,
      passwordHash: advisorPassword,
    }));
  }
  const teachers = [];
  for (let index = 0; index < TEACHER_COUNT; index += 1) {
    teachers.push(await store.insertTeacher({
      ...audit,
      name: teacherNames[index],
      avatar: "",
      gender: index % 2 === 0 ? "男" : "女",
      birthDate: `198${index}-06-1${index}`,
      phone: `1380000200${index + 1}`,
      courseTypeId: index % 2 === 0 ? piano.id : art.id,
      account: `teacher0${index + 1}`,
      passwordHash: teacherPassword,
    }));
  }

  const usedNames = new Set((await store.classes()).map((item) => item.name));
  const typeSerial = new Map<number, number>();
  const classes = [];
  for (const teacher of teachers) {
    const type = types.find((item) => item.id === teacher.courseTypeId)!;
    const serial = (typeSerial.get(type.id) ?? 0) + 1;
    typeSerial.set(type.id, serial);
    let name = `${type.name}${serial}班`;
    while (usedNames.has(name)) name = `${name}A`;
    usedNames.add(name);
    classes.push(await store.insertClass({ ...audit, name, teacherId: teacher.id, courseTypeId: teacher.courseTypeId }));
  }

  const slots = shuffle(
    WEEKDAYS.flatMap((weekday) => TIME_RANGES.map((timeRange) => ({ weekday, timeRange }))),
    random,
  ).slice(0, classes.length);
  const sessions = [];
  for (let index = 0; index < classes.length; index += 1) {
    const slot = slots[index];
    const classGroup = classes[index];
    sessions.push(await store.insertSession({
      ...audit,
      classId: classGroup.id,
      teacherId: classGroup.teacherId,
      timeRange: slot.timeRange,
      courseTypeId: classGroup.courseTypeId,
      topic: "每周常规课",
      status: "待上课",
      weekday: slot.weekday,
      sessionDate: dateForWeekday(slot.weekday),
      remark: "",
    }));
  }

  const serial = (await store.students()).reduce((max, student) => {
    const value = Number(student.studentNo.replace(/^S/, ""));
    return Number.isInteger(value) ? Math.max(max, value) : max;
  }, 0);
  for (let index = 0; index < STUDENT_COUNT; index += 1) {
    const advisor = advisors[index % advisors.length];
    const classGroup = classes[index % classes.length];
    const birth = new Date(2012 + (index % 6), index % 12, (index % 27) + 1);
    const student = await store.insertStudent({
      ...audit,
      name: studentName(index),
      studentNo: `S${String(serial + index + 1).padStart(4, "0")}`,
      gender: index % 2 === 0 ? "男" : "女",
      birthDate: localDate(birth),
      grade: GRADES[index % GRADES.length],
      phone: `139${String(10000000 + index).padStart(8, "0")}`,
      parentPhone: `137${String(10000000 + index).padStart(8, "0")}`,
    });
    await store.insertLink({ advisorId: advisor.id, studentId: student.id, ...audit });
    await store.insertPurchase({
      ...audit,
      studentId: student.id,
      advisorId: advisor.id,
      amount: 1600,
      courseTypeId: classGroup.courseTypeId,
      hours: 16,
    });
    await store.insertClassStudent({ classId: classGroup.id, studentId: student.id, ...audit });
  }

  return {
    advisors: advisors.map((item) => ({ account: item.account, name: item.name })),
    teachers: teachers.map((item) => ({ account: item.account, name: item.name })),
    classes: classes.map((item, index) => ({
      name: item.name,
      weekday: sessions[index].weekday,
      timeRange: sessions[index].timeRange,
      studentCount: STUDENT_COUNT / classes.length,
    })),
    studentCount: STUDENT_COUNT,
  };
}
