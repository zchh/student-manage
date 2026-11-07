import type { AttendStatus, Role } from "./types.js";

export const LOW_HOURS = 2;

export class SpecError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function assertRole(role: Role, allowed: Role): void {
  if (role === allowed) return;
  throw new SpecError(
    role === "teacher" ? "SPEC-PERM-01" : "SPEC-PERM-02",
    role === "teacher" ? "教师不能进入顾问功能" : "顾问不能进入教师功能",
    403,
  );
}

export function assertNotBoughtRemark(bought: boolean, remark: string): void {
  if (!bought && remark.trim() === "") {
    throw new SpecError("SPEC-TRIAL-01", "未买课必须填写原因");
  }
}

export function lessonBalance(purchased: number, attended: number) {
  const remaining = purchased - attended;
  return {
    purchased,
    completed: attended,
    remaining,
    low: remaining > 0 && remaining <= LOW_HOURS,
  };
}

export function assertCanAttend(
  purchased: number,
  consumedExcludingThis: number,
  status: AttendStatus,
): void {
  const next = consumedExcludingThis + (status === "已到" ? 1 : 0);
  if (next > purchased) {
    throw new SpecError("SPEC-HOUR-03", "剩余课时不足，不能记为已到");
  }
}

export function isNewStudent(completed: number): boolean {
  return completed === 0;
}
