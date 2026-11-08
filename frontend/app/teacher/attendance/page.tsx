"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pager, usePager } from "@/components/Pager";
import { api } from "@/lib/api";

interface ClassRow { id: number; name: string; teacherId: number; teacherName: string; courseTypeName: string }
interface Session { id: number; weekday: string; sessionDate: string; timeRange: string; remark: string; status: string }
interface SheetStudent {
  studentId: number; studentName: string; studentNo: string; isNew: boolean;
  status: string; remainingHours: number; remark: string;
}
interface Sheet {
  className: string; teacherId: number; teacherName: string; courseTypeName: string;
  weekday: string; timeRange: string; students: SheetStudent[];
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sessionId, setSessionId] = useState(0);
  const [error, setError] = useState("");
  const sessionPager = usePager(sessions);
  const studentPager = usePager(sheet?.students ?? []);

  async function loadClasses(id = 0) {
    const list = await api<ClassRow[]>("/api/teacher/classes");
    setClasses(list);
    const current = id || list[0]?.id || 0;
    setClassId(current);
    if (current) setSessions(await api<Session[]>(`/api/teacher/classes/${current}/sessions`));
  }
  useEffect(() => { loadClasses().catch((reason) => setError(reason.message)); }, []);

  async function openSheet(id: number) {
    setSessionId(id);
    setSheet(await api<Sheet>(`/api/teacher/sessions/${id}/attendance`));
  }

  function update(studentId: number, patch: Partial<SheetStudent>) {
    setSheet((current) => current && ({
      ...current,
      students: current.students.map((item) => item.studentId === studentId ? { ...item, ...patch } : item),
    }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sheet) return;
    setError("");
    try {
      await api(`/api/teacher/sessions/${sessionId}/attendance`, {
        method: "POST",
        body: JSON.stringify({
          items: sheet.students.map((item) => ({
            studentId: item.studentId,
            status: item.status || "未到",
            remark: item.remark,
          })),
        }),
      });
      await openSheet(sessionId);
      await loadClasses(classId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "签到失败");
    }
  }

  const current = classes.find((item) => item.id === classId);
  return (
    <>
      <div className="top">
        <div>
          <h1>签到</h1>
          {current && <p>班级名称 {current.name}　教师编号 {current.teacherId}　教师姓名 {current.teacherName}　课程类型 {current.courseTypeName}</p>}
        </div>
        <select value={classId} onChange={(event) => { setSheet(null); loadClasses(Number(event.target.value)).catch((reason) => setError(reason.message)); }}>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {!sheet && (
        <>
        <table>
          <thead><tr><th>周几</th><th>日期</th><th>课时</th><th>备注</th><th>操作</th></tr></thead>
          <tbody>
            {sessionPager.slice.map((row) => (
              <tr key={row.id}>
                <td>{row.weekday}</td><td>{row.sessionDate}</td><td>{row.timeRange}</td><td>{row.remark}</td>
                <td><button onClick={() => openSheet(row.id).catch((reason) => setError(reason.message))}>签到</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager {...sessionPager} />
        </>
      )}
      {sheet && (
        <form onSubmit={onSubmit}>
          <div className="panel">
            <p>班级名称 {sheet.className}　教师编号 {sheet.teacherId}　教师姓名 {sheet.teacherName}　课程类型 {sheet.courseTypeName}　周几 {sheet.weekday}　课时 {sheet.timeRange}</p>
            <button type="button" className="ghost" onClick={() => setSheet(null)}>返回</button>
          </div>
          <table>
            <thead><tr><th>学生姓名</th><th>学生编号</th><th>是否新生</th><th>是否已到</th><th>剩余课时</th><th>备注</th></tr></thead>
            <tbody>
              {studentPager.slice.map((row) => (
                <tr key={row.studentId}>
                  <td>{row.studentName}</td><td>{row.studentNo}</td><td>{row.isNew ? "是" : "否"}</td>
                  <td>
                    <select value={row.status || "未到"} onChange={(event) => update(row.studentId, { status: event.target.value })}>
                      <option value="已到">已到</option>
                      <option value="未到">未到</option>
                    </select>
                  </td>
                  <td>{row.remainingHours}</td>
                  <td><input value={row.remark} onChange={(event) => update(row.studentId, { remark: event.target.value })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager {...studentPager} />
          <p><button type="submit">提交签到</button></p>
        </form>
      )}
    </>
  );
}
