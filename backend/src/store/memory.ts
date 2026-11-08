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
import type { Store } from "./types.js";

type Row = { id: number };

export function createMemoryStore(): Store {
  const courseTypes: CourseType[] = [];
  const advisors: Advisor[] = [];
  const teachers: Teacher[] = [];
  const students: Student[] = [];
  const links: AdvisorLink[] = [];
  const purchases: Purchase[] = [];
  const trials: Trial[] = [];
  const trialVisits: TrialVisit[] = [];
  const trialAssists: TrialAssist[] = [];
  const classes: ClassGroup[] = [];
  const classStudents: ClassStudent[] = [];
  const sessions: Session[] = [];
  const attendances: Attendance[] = [];

  const push = <T extends Row>(list: T[], row: Omit<T, "id">): T => {
    const saved = { ...row, id: (list.at(-1)?.id ?? 0) + 1 } as T;
    list.push(saved);
    return saved;
  };

  return {
    now: () => new Date().toISOString(),
    courseTypes: async () => courseTypes.map((row) => ({ ...row })),
    advisors: async () => advisors.map((row) => ({ ...row })),
    teachers: async () => teachers.map((row) => ({ ...row })),
    students: async () => students.map((row) => ({ ...row })),
    links: async () => links.map((row) => ({ ...row })),
    purchases: async () => purchases.map((row) => ({ ...row })),
    trials: async () => trials.map((row) => ({ ...row })),
    trialVisits: async () => trialVisits.map((row) => ({ ...row })),
    trialAssists: async () => trialAssists.map((row) => ({ ...row })),
    classes: async () => classes.map((row) => ({ ...row })),
    classStudents: async () => classStudents.map((row) => ({ ...row })),
    sessions: async () => sessions.map((row) => ({ ...row })),
    attendances: async () => attendances.map((row) => ({ ...row })),
    insertCourseType: async (row) => push(courseTypes, row),
    insertAdvisor: async (row) => push(advisors, row),
    insertTeacher: async (row) => push(teachers, row),
    insertStudent: async (row) => push(students, row),
    insertLink: async (row) => {
      links.push({ ...row });
    },
    insertPurchase: async (row) => push(purchases, row),
    insertTrial: async (row) => push(trials, row),
    updateTrial: async (row) => {
      const index = trials.findIndex((item) => item.id === row.id);
      trials[index] = { ...row };
      return { ...row };
    },
    insertTrialVisit: async (row) => push(trialVisits, row),
    deleteTrialVisit: async (id) => {
      const index = trialVisits.findIndex((item) => item.id === id);
      if (index >= 0) trialVisits.splice(index, 1);
    },
    insertTrialAssist: async (row) => push(trialAssists, row),
    insertClass: async (row) => push(classes, row),
    insertClassStudent: async (row) => {
      classStudents.push({ ...row });
    },
    insertSession: async (row) => push(sessions, row),
    updateSession: async (row) => {
      const index = sessions.findIndex((item) => item.id === row.id);
      sessions[index] = { ...row };
      return { ...row };
    },
    insertAttendance: async (row) => push(attendances, row),
    updateAttendance: async (row) => {
      const index = attendances.findIndex((item) => item.id === row.id);
      attendances[index] = { ...row };
      return { ...row };
    },
    deleteStudent: async (id) => {
      const index = students.findIndex((item) => item.id === id);
      if (index >= 0) students.splice(index, 1);
      for (let i = links.length - 1; i >= 0; i -= 1) {
        if (links[i].studentId === id) links.splice(i, 1);
      }
    },
  };
}
