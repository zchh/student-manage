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

export interface Store {
  now(): string;
  courseTypes(): Promise<CourseType[]>;
  advisors(): Promise<Advisor[]>;
  teachers(): Promise<Teacher[]>;
  students(): Promise<Student[]>;
  links(): Promise<AdvisorLink[]>;
  purchases(): Promise<Purchase[]>;
  trials(): Promise<Trial[]>;
  trialVisits(): Promise<TrialVisit[]>;
  trialAssists(): Promise<TrialAssist[]>;
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
  insertTrialVisit(row: Omit<TrialVisit, "id">): Promise<TrialVisit>;
  deleteTrialVisit(id: number): Promise<void>;
  insertTrialAssist(row: Omit<TrialAssist, "id">): Promise<TrialAssist>;
  insertClass(row: Omit<ClassGroup, "id">): Promise<ClassGroup>;
  insertClassStudent(row: ClassStudent): Promise<void>;
  insertSession(row: Omit<Session, "id">): Promise<Session>;
  updateSession(row: Session): Promise<Session>;
  deleteSession(id: number): Promise<void>;
  insertAttendance(row: Omit<Attendance, "id">): Promise<Attendance>;
  updateAttendance(row: Attendance): Promise<Attendance>;
  deleteStudent(id: number): Promise<void>;
}
