import { describe, expect, it } from "vitest";
import { assertCanAttend, isNewStudent, lessonBalance } from "../src/domain/rules.js";

describe("课时与试听规则", () => {
  it("SPEC-HOUR-02 已到扣课时，未到不扣", () => {
    expect(lessonBalance(4, 1)).toMatchObject({ remaining: 3, completed: 1, low: false });
    expect(lessonBalance(4, 0)).toMatchObject({ remaining: 4, completed: 0 });
  });

  it("SPEC-HOUR-03 已到次数不能超过已购课时", () => {
    expect(() => assertCanAttend(1, 1, "已到")).toThrowError(expect.objectContaining({ code: "SPEC-HOUR-03" }));
    expect(() => assertCanAttend(1, 1, "未到")).not.toThrow();
    expect(() => assertCanAttend(1, 0, "已到")).not.toThrow();
  });

  it("SPEC-HOUR-04 剩余 1 或 2 课时标记快用完", () => {
    expect(lessonBalance(4, 2).low).toBe(true);
    expect(lessonBalance(4, 3).low).toBe(true);
    expect(lessonBalance(4, 1).low).toBe(false);
    expect(lessonBalance(4, 4).low).toBe(false);
  });

  it("SPEC-ATTEND-01 还没有已到记录的学生是新生", () => {
    expect(isNewStudent(0)).toBe(true);
    expect(isNewStudent(1)).toBe(false);
  });
});
