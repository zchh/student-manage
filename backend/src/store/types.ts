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
} from "../domain/types.js";

export interface Store {
  now(): string;
  courseTypes(): Promise<CourseType[]>;
  advisors(): Promise<Advisor[]>;
  teachers(): Promise<Teacher[]>;
  students(): Promise<Student[]>;
  links(): Promise<AdvisorLink[]>;
  purchases(): Promise<Purchase[]>;
  trials(): Promise<Trial[]>;
  classes(): Promise<ClassGroup[]>;
  classStudents(): Promise<ClassStudent[]>;
  sessions(): Promise<Session[]>;
  attendances(): Promise<Attendance[]>;
  insertCourseType(row: Omit<CourseType, "id">): Promise<CourseType>;
  insertAdvisor(row: Omit<Advisor, "id">): Promise<Advisor>;
  insertTeacher(row: Omit<Teacher, "id">): Promise<Teacher>;
  insertStudent(row: Omit<Student, "id">): Promise<Student>;
  insertLink(row: AdvisorLink): Promise<void>;
  insertPurchase(row: Omit<Purchase, "id">): Promise<Purchase>;
  insertTrial(row: Omit<Trial, "id">): Promise<Trial>;
  updateTrial(row: Trial): Promise<Trial>;
  insertClass(row: Omit<ClassGroup, "id">): Promise<ClassGroup>;
  insertClassStudent(row: ClassStudent): Promise<void>;
  insertSession(row: Omit<Session, "id">): Promise<Session>;
  updateSession(row: Session): Promise<Session>;
  insertAttendance(row: Omit<Attendance, "id">): Promise<Attendance>;
  updateAttendance(row: Attendance): Promise<Attendance>;
  deleteStudent(id: number): Promise<void>;
}
