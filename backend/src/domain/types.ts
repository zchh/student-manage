export type Role = "advisor" | "teacher";
export type SessionStatus = "待上课" | "教师请假" | "已完成";
export type AttendStatus = "已到" | "未到";

export interface Audit {
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface CourseType extends Audit {
  id: number;
  name: string;
}

export interface Advisor extends Audit {
  id: number;
  name: string;
  avatar: string;
  gender: string;
  birthDate: string;
  phone: string;
  account: string;
  passwordHash: string;
}

export interface Teacher extends Audit {
  id: number;
  name: string;
  avatar: string;
  gender: string;
  birthDate: string;
  phone: string;
  courseTypeId: number;
  account: string;
  passwordHash: string;
}

export interface Student extends Audit {
  id: number;
  name: string;
  studentNo: string;
  gender: string;
  birthDate: string;
  grade: string;
  phone: string;
  parentPhone: string;
}

export interface AdvisorLink extends Audit {
  advisorId: number;
  studentId: number;
}

export interface Purchase extends Audit {
  id: number;
  studentId: number;
  advisorId: number;
  amount: number;
  courseTypeId: number;
  hours: number;
}

export interface Trial extends Audit {
  id: number;
  advisorId: number;
  teacherId: number;
  courseTypeId: number;
  timeRange: string;
  studentName: string;
  gender: string;
  birthDate: string;
  phone: string;
  parentPhone: string;
  bought: boolean;
  remark: string;
  plannedEnrollDate: string;
}

export interface TrialVisit {
  id: number;
  trialId: number;
  content: string;
  createdAt: string;
  createdBy: number | null;
}

export interface TrialAssist {
  id: number;
  trialId: number;
  content: string;
  createdAt: string;
  createdBy: number | null;
}

export interface ClassGroup extends Audit {
  id: number;
  name: string;
  teacherId: number;
  courseTypeId: number;
}

export interface ClassStudent extends Audit {
  classId: number;
  studentId: number;
}

export interface Session extends Audit {
  id: number;
  classId: number;
  teacherId: number;
  timeRange: string;
  courseTypeId: number;
  topic: string;
  status: SessionStatus;
  weekday: string;
  sessionDate: string;
  remark: string;
}

export interface Attendance extends Audit {
  id: number;
  sessionId: number;
  studentId: number;
  status: AttendStatus;
  remark: string;
}

export interface Actor {
  id: number;
  role: Role;
  name: string;
}
