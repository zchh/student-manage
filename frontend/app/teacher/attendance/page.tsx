"use client";

import { useEffect, useRef, useState } from "react";
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
interface StudentDetail {
  id: number; studentNo: string; name: string; gender: string; birthDate: string; grade: string;
  phone: string; parentPhone: string; advisorId: number | null; advisorName: string;
  completedHours: number; remainingHours: number; low: boolean;
}

function Facts({ items }: { items: [string, string | number][] }) {
  return (
    <p className="facts">
      {items.map(([key, value]) => <span key={key}><strong>{key}</strong>: {value}</span>)}
    </p>
  );
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sessionId, setSessionId] = useState(0);
  const [profile, setProfile] = useState<StudentDetail | null>(null);
  const [remarkEdit, setRemarkEdit] = useState<{ studentId: number; name: string; draft: string } | null>(null);
  const [savingId, setSavingId] = useState(0);
  const [error, setError] = useState("");
  const savedRemark = useRef(new Map<number, string>());
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

  async function reloadSheet(id: number) {
    const next = await api<Sheet>(`/api/teacher/sessions/${id}/attendance`);
    for (const item of next.students) savedRemark.current.set(item.studentId, item.remark);
    setSheet(next);
  }

  async function openSheet(id: number) {
    setSessionId(id);
    setProfile(null);
    setRemarkEdit(null);
    await reloadSheet(id);
  }

  async function showStudent(studentId: number) {
    setError("");
    const list = await api<StudentDetail[]>(`/api/teacher/classes/${classId}/students`);
    const found = list.find((item) => item.id === studentId);
    if (!found) {
      setError("学生不存在");
      return;
    }
    setProfile(found);
  }

  function update(studentId: number, patch: Partial<SheetStudent>) {
    setSheet((current) => current && ({
      ...current,
      students: current.students.map((item) => item.studentId === studentId ? { ...item, ...patch } : item),
    }));
  }

  async function saveStudent(row: SheetStudent, status: "已到" | "未到", remark = row.remark) {
    const current = row.status || "未到";
    if (savingId) return false;
    if (current === status && remark === (savedRemark.current.get(row.studentId) ?? "")) return true;
    setError("");
    setSavingId(row.studentId);
    update(row.studentId, { status, remark });
    try {
      await api(`/api/teacher/sessions/${sessionId}/attendance`, {
        method: "POST",
        body: JSON.stringify({ items: [{ studentId: row.studentId, status, remark }] }),
      });
      await reloadSheet(sessionId);
      await loadClasses(classId);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "签到失败");
      await reloadSheet(sessionId);
      return false;
    } finally {
      setSavingId(0);
    }
  }

  async function saveRemark() {
    if (!remarkEdit || !sheet) return;
    const row = sheet.students.find((item) => item.studentId === remarkEdit.studentId);
    if (!row) return;
    const ok = await saveStudent(row, row.status === "已到" ? "已到" : "未到", remarkEdit.draft);
    if (ok) setRemarkEdit(null);
  }

  const current = classes.find((item) => item.id === classId);
  return (
    <>
      <div className="top">
        <div>
          <h1>签到</h1>
          {current && !sheet && <Facts items={[["班级名称", current.name], ["教师编号", current.teacherId], ["教师姓名", current.teacherName], ["课程类型", current.courseTypeName]]} />}
        </div>
        <select value={classId} onChange={(event) => { setSheet(null); setProfile(null); setRemarkEdit(null); loadClasses(Number(event.target.value)).catch((reason) => setError(reason.message)); }}>
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
        <>
          <div className="panel">
            <Facts items={[["班级名称", sheet.className], ["教师编号", sheet.teacherId], ["教师姓名", sheet.teacherName], ["课程类型", sheet.courseTypeName], ["周几", sheet.weekday], ["课时", sheet.timeRange]]} />
            <button type="button" className="ghost" onClick={() => { setSheet(null); setProfile(null); setRemarkEdit(null); }}>返回</button>
          </div>
          {profile && (
            <div className="panel">
              <div className="grid">
                <label>学生编号<input value={profile.studentNo} readOnly /></label>
                <label>学生姓名<input value={profile.name} readOnly /></label>
                <label>性别<input value={profile.gender} readOnly /></label>
                <label>出生年月日<input value={profile.birthDate} readOnly /></label>
                <label>年级<input value={profile.grade} readOnly /></label>
                <label>联系方式<input value={profile.phone} readOnly /></label>
                <label>家长联系方式<input value={profile.parentPhone} readOnly /></label>
                <label>班级<input value={sheet.className} readOnly /></label>
                <label>顾问编号<input value={profile.advisorId ?? ""} readOnly /></label>
                <label>顾问姓名<input value={profile.advisorName} readOnly /></label>
                <label>已完成课时<input value={profile.completedHours} readOnly /></label>
                <label>剩余课时<input value={`${profile.remainingHours}${profile.low ? " 快用完" : ""}`} readOnly /></label>
              </div>
              <p><button type="button" className="ghost" onClick={() => setProfile(null)}>关闭</button></p>
            </div>
          )}
          {remarkEdit && (
            <div className="modal-mask" onClick={() => setRemarkEdit(null)}>
              <div className="modal" role="dialog" aria-label={`${remarkEdit.name}的备注`} onClick={(event) => event.stopPropagation()}>
                <p>{remarkEdit.name}的备注</p>
                <label>备注<textarea value={remarkEdit.draft} onChange={(event) => setRemarkEdit({ ...remarkEdit, draft: event.target.value })} /></label>
                <div className="actions">
                  <button type="button" onClick={() => saveRemark()} disabled={savingId === remarkEdit.studentId}>保存</button>
                  <button type="button" className="ghost" onClick={() => setRemarkEdit(null)}>关闭</button>
                </div>
              </div>
            </div>
          )}
          <table>
            <thead><tr><th>学生姓名</th><th>学生编号</th><th>是否新生</th><th>是否已到</th><th>剩余课时</th><th>备注</th><th>操作</th></tr></thead>
            <tbody>
              {studentPager.slice.map((row) => (
                <tr key={row.studentId}>
                  <td>{row.studentName}</td><td>{row.studentNo}</td><td>{row.isNew ? "是" : "否"}</td>
                  <td className="checks">
                    <label><input type="checkbox" checked={(row.status || "未到") !== "已到"} disabled={savingId === row.studentId} onChange={() => saveStudent(row, "未到")} />未到</label>
                    <label><input type="checkbox" checked={row.status === "已到"} disabled={savingId === row.studentId} onChange={() => saveStudent(row, "已到")} />已到</label>
                  </td>
                  <td>{row.remainingHours}</td>
                  <td>{row.remark}</td>
                  <td>
                    <button type="button" className="ghost" onClick={() => showStudent(row.studentId).catch((reason) => setError(reason.message))}>查看学生信息</button>
                    <button type="button" className="ghost" onClick={() => setRemarkEdit({ studentId: row.studentId, name: row.studentName, draft: row.remark })}>备注</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager {...studentPager} />
        </>
      )}
    </>
  );
}
