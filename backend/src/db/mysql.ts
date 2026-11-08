import mysql from "mysql2/promise";
import type {
  Advisor,
  AdvisorLink,
  Attendance,
  ClassGroup,
  ClassStudent,
  CourseType,
  Purchase,
  Session,
  Student,
  Teacher,
  Trial,
  TrialAssist,
  TrialVisit,
} from "../domain/types.js";
import type { Store } from "../store/types.js";

const schema = `
CREATE TABLE IF NOT EXISTS course_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL
);
CREATE TABLE IF NOT EXISTS advisors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  avatar VARCHAR(255) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  birth_date VARCHAR(20) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  account VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL
);
CREATE TABLE IF NOT EXISTS teachers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  avatar VARCHAR(255) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  birth_date VARCHAR(20) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  course_type_id INT NOT NULL,
  account VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL
);
CREATE TABLE IF NOT EXISTS students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  student_no VARCHAR(32) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  birth_date VARCHAR(20) NOT NULL,
  grade VARCHAR(32) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  parent_phone VARCHAR(32) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL
);
CREATE TABLE IF NOT EXISTS advisor_students (
  advisor_id INT NOT NULL,
  student_id INT NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  PRIMARY KEY (advisor_id, student_id)
);
CREATE TABLE IF NOT EXISTS purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  advisor_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  course_type_id INT NOT NULL,
  hours INT NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL
);
CREATE TABLE IF NOT EXISTS trials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  advisor_id INT NOT NULL,
  teacher_id INT NOT NULL,
  course_type_id INT NOT NULL,
  time_range VARCHAR(64) NOT NULL,
  student_name VARCHAR(64) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  birth_date VARCHAR(20) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  parent_phone VARCHAR(32) NOT NULL,
  bought TINYINT NOT NULL,
  remark VARCHAR(255) NOT NULL,
  planned_enroll_date VARCHAR(20) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL
);
CREATE TABLE IF NOT EXISTS classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  teacher_id INT NOT NULL,
  course_type_id INT NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL
);
CREATE TABLE IF NOT EXISTS class_students (
  class_id INT NOT NULL,
  student_id INT NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  PRIMARY KEY (class_id, student_id)
);
CREATE TABLE IF NOT EXISTS class_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  teacher_id INT NOT NULL,
  time_range VARCHAR(64) NOT NULL,
  course_type_id INT NOT NULL,
  topic VARCHAR(128) NOT NULL,
  status VARCHAR(16) NOT NULL,
  weekday VARCHAR(16) NOT NULL,
  session_date VARCHAR(20) NOT NULL,
  remark VARCHAR(255) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL
);
CREATE TABLE IF NOT EXISTS attendances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  student_id INT NOT NULL,
  status VARCHAR(16) NOT NULL,
  remark VARCHAR(255) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  created_by INT NULL,
  updated_by INT NULL
);
CREATE TABLE IF NOT EXISTS trial_visits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trial_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  created_by INT NULL
);
CREATE TABLE IF NOT EXISTS trial_assists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trial_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  created_by INT NULL
);
`;

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function num(value: unknown): number {
  return Number(value);
}

function audit(row: Row) {
  return {
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    createdBy: row.created_by == null ? null : num(row.created_by),
    updatedBy: row.updated_by == null ? null : num(row.updated_by),
  };
}

export async function createMysqlStore(): Promise<Store> {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? "root",
    password: process.env.MYSQL_PASSWORD ?? "root",
    database: process.env.MYSQL_DATABASE ?? "student_manage",
    waitForConnections: true,
  });
  for (const statement of schema.split(";").map((item) => item.trim()).filter(Boolean)) {
    await pool.query(statement);
  }
  try {
    await pool.query("ALTER TABLE trials DROP COLUMN opinion");
  } catch (error) {
    if ((error as { code?: string }).code !== "ER_CANT_DROP_FIELD_OR_KEY") throw error;
  }
  const q = async (sql: string, params: unknown[] = []) => (await pool.query(sql, params))[0] as Row[];

  const mapCourse = (row: Row): CourseType => ({ id: num(row.id), name: text(row.name), ...audit(row) });
  const mapAdvisor = (row: Row): Advisor => ({
    id: num(row.id), name: text(row.name), avatar: text(row.avatar), gender: text(row.gender),
    birthDate: text(row.birth_date), phone: text(row.phone), account: text(row.account),
    passwordHash: text(row.password_hash), ...audit(row),
  });
  const mapTeacher = (row: Row): Teacher => ({
    ...mapAdvisor(row), courseTypeId: num(row.course_type_id),
  });
  const mapStudent = (row: Row): Student => ({
    id: num(row.id), name: text(row.name), studentNo: text(row.student_no), gender: text(row.gender),
    birthDate: text(row.birth_date), grade: text(row.grade), phone: text(row.phone),
    parentPhone: text(row.parent_phone), ...audit(row),
  });
  const mapLink = (row: Row): AdvisorLink => ({
    advisorId: num(row.advisor_id), studentId: num(row.student_id), ...audit(row),
  });
  const mapPurchase = (row: Row): Purchase => ({
    id: num(row.id), studentId: num(row.student_id), advisorId: num(row.advisor_id),
    amount: num(row.amount), courseTypeId: num(row.course_type_id), hours: num(row.hours), ...audit(row),
  });
  const mapTrial = (row: Row): Trial => ({
    id: num(row.id), advisorId: num(row.advisor_id), teacherId: num(row.teacher_id),
    courseTypeId: num(row.course_type_id), timeRange: text(row.time_range), studentName: text(row.student_name),
    gender: text(row.gender), birthDate: text(row.birth_date), phone: text(row.phone),
    parentPhone: text(row.parent_phone), bought: Boolean(row.bought), remark: text(row.remark),
    plannedEnrollDate: text(row.planned_enroll_date), ...audit(row),
  });
  const mapVisit = (row: Row): TrialVisit => ({
    id: num(row.id), trialId: num(row.trial_id), content: text(row.content),
    createdAt: text(row.created_at), createdBy: row.created_by == null ? null : num(row.created_by),
  });
  const mapAssist = (row: Row): TrialAssist => ({
    id: num(row.id), trialId: num(row.trial_id), content: text(row.content),
    createdAt: text(row.created_at), createdBy: row.created_by == null ? null : num(row.created_by),
  });
  const mapClass = (row: Row): ClassGroup => ({
    id: num(row.id), name: text(row.name), teacherId: num(row.teacher_id),
    courseTypeId: num(row.course_type_id), ...audit(row),
  });
  const mapMember = (row: Row): ClassStudent => ({
    classId: num(row.class_id), studentId: num(row.student_id), ...audit(row),
  });
  const mapSession = (row: Row): Session => ({
    id: num(row.id), classId: num(row.class_id), teacherId: num(row.teacher_id),
    timeRange: text(row.time_range), courseTypeId: num(row.course_type_id), topic: text(row.topic),
    status: text(row.status) as Session["status"], weekday: text(row.weekday),
    sessionDate: text(row.session_date), remark: text(row.remark), ...audit(row),
  });
  const mapAttendance = (row: Row): Attendance => ({
    id: num(row.id), sessionId: num(row.session_id), studentId: num(row.student_id),
    status: text(row.status) as Attendance["status"], remark: text(row.remark), ...audit(row),
  });

  return {
    now: () => new Date().toISOString(),
    courseTypes: async () => (await q("SELECT * FROM course_types ORDER BY id")).map(mapCourse),
    advisors: async () => (await q("SELECT * FROM advisors ORDER BY id")).map(mapAdvisor),
    teachers: async () => (await q("SELECT * FROM teachers ORDER BY id")).map(mapTeacher),
    students: async () => (await q("SELECT * FROM students ORDER BY id")).map(mapStudent),
    links: async () => (await q("SELECT * FROM advisor_students")).map(mapLink),
    purchases: async () => (await q("SELECT * FROM purchases ORDER BY id")).map(mapPurchase),
    trials: async () => (await q("SELECT * FROM trials ORDER BY id")).map(mapTrial),
    trialVisits: async () => (await q("SELECT * FROM trial_visits ORDER BY id")).map(mapVisit),
    trialAssists: async () => (await q("SELECT * FROM trial_assists ORDER BY id")).map(mapAssist),
    classes: async () => (await q("SELECT * FROM classes ORDER BY id")).map(mapClass),
    classStudents: async () => (await q("SELECT * FROM class_students")).map(mapMember),
    sessions: async () => (await q("SELECT * FROM class_sessions ORDER BY id")).map(mapSession),
    attendances: async () => (await q("SELECT * FROM attendances ORDER BY id")).map(mapAttendance),
    insertCourseType: async (row) => {
      const [result] = await pool.query(
        "INSERT INTO course_types (name, created_at, updated_at, created_by, updated_by) VALUES (?,?,?,?,?)",
        [row.name, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    insertAdvisor: async (row) => {
      const [result] = await pool.query(
        `INSERT INTO advisors (name, avatar, gender, birth_date, phone, account, password_hash, created_at, updated_at, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [row.name, row.avatar, row.gender, row.birthDate, row.phone, row.account, row.passwordHash, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    insertTeacher: async (row) => {
      const [result] = await pool.query(
        `INSERT INTO teachers (name, avatar, gender, birth_date, phone, course_type_id, account, password_hash, created_at, updated_at, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [row.name, row.avatar, row.gender, row.birthDate, row.phone, row.courseTypeId, row.account, row.passwordHash, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    insertStudent: async (row) => {
      const [result] = await pool.query(
        `INSERT INTO students (name, student_no, gender, birth_date, grade, phone, parent_phone, created_at, updated_at, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [row.name, row.studentNo, row.gender, row.birthDate, row.grade, row.phone, row.parentPhone, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    insertLink: async (row) => {
      await pool.query(
        `INSERT INTO advisor_students (advisor_id, student_id, created_at, updated_at, created_by, updated_by) VALUES (?,?,?,?,?,?)`,
        [row.advisorId, row.studentId, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
    },
    insertPurchase: async (row) => {
      const [result] = await pool.query(
        `INSERT INTO purchases (student_id, advisor_id, amount, course_type_id, hours, created_at, updated_at, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [row.studentId, row.advisorId, row.amount, row.courseTypeId, row.hours, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    insertTrial: async (row) => {
      const [result] = await pool.query(
        `INSERT INTO trials (advisor_id, teacher_id, course_type_id, time_range, student_name, gender, birth_date, phone, parent_phone, bought, remark, planned_enroll_date, created_at, updated_at, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [row.advisorId, row.teacherId, row.courseTypeId, row.timeRange, row.studentName, row.gender, row.birthDate, row.phone, row.parentPhone, row.bought ? 1 : 0, row.remark, row.plannedEnrollDate, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    updateTrial: async (row) => {
      await pool.query(
        `UPDATE trials SET teacher_id=?, course_type_id=?, time_range=?, student_name=?, gender=?, birth_date=?, phone=?, parent_phone=?, bought=?, remark=?, planned_enroll_date=?, updated_at=?, updated_by=? WHERE id=?`,
        [row.teacherId, row.courseTypeId, row.timeRange, row.studentName, row.gender, row.birthDate, row.phone, row.parentPhone, row.bought ? 1 : 0, row.remark, row.plannedEnrollDate, row.updatedAt, row.updatedBy, row.id],
      );
      return row;
    },
    insertTrialVisit: async (row) => {
      const [result] = await pool.query(
        `INSERT INTO trial_visits (trial_id, content, created_at, created_by) VALUES (?,?,?,?)`,
        [row.trialId, row.content, row.createdAt, row.createdBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    deleteTrialVisit: async (id) => {
      await pool.query("DELETE FROM trial_visits WHERE id=?", [id]);
    },
    insertTrialAssist: async (row) => {
      const [result] = await pool.query(
        `INSERT INTO trial_assists (trial_id, content, created_at, created_by) VALUES (?,?,?,?)`,
        [row.trialId, row.content, row.createdAt, row.createdBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    insertClass: async (row) => {
      const [result] = await pool.query(
        `INSERT INTO classes (name, teacher_id, course_type_id, created_at, updated_at, created_by, updated_by) VALUES (?,?,?,?,?,?,?)`,
        [row.name, row.teacherId, row.courseTypeId, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    insertClassStudent: async (row) => {
      await pool.query(
        `INSERT INTO class_students (class_id, student_id, created_at, updated_at, created_by, updated_by) VALUES (?,?,?,?,?,?)`,
        [row.classId, row.studentId, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
    },
    insertSession: async (row) => {
      const [result] = await pool.query(
        `INSERT INTO class_sessions (class_id, teacher_id, time_range, course_type_id, topic, status, weekday, session_date, remark, created_at, updated_at, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [row.classId, row.teacherId, row.timeRange, row.courseTypeId, row.topic, row.status, row.weekday, row.sessionDate, row.remark, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    updateSession: async (row) => {
      await pool.query(
        `UPDATE class_sessions SET status=?, remark=?, updated_at=?, updated_by=? WHERE id=?`,
        [row.status, row.remark, row.updatedAt, row.updatedBy, row.id],
      );
      return row;
    },
    insertAttendance: async (row) => {
      const [result] = await pool.query(
        `INSERT INTO attendances (session_id, student_id, status, remark, created_at, updated_at, created_by, updated_by) VALUES (?,?,?,?,?,?,?,?)`,
        [row.sessionId, row.studentId, row.status, row.remark, row.createdAt, row.updatedAt, row.createdBy, row.updatedBy],
      );
      return { ...row, id: num((result as { insertId: number }).insertId) };
    },
    updateAttendance: async (row) => {
      await pool.query(
        `UPDATE attendances SET status=?, remark=?, updated_at=?, updated_by=? WHERE id=?`,
        [row.status, row.remark, row.updatedAt, row.updatedBy, row.id],
      );
      return row;
    },
    deleteStudent: async (id) => {
      await pool.query("DELETE FROM advisor_students WHERE student_id=?", [id]);
      await pool.query("DELETE FROM students WHERE id=?", [id]);
    },
  };
}
