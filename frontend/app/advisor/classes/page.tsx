"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Teacher { id: number; name: string }
interface Type { id: number; name: string }
interface Student { id: number; name: string }
interface ClassRow {
  id: number; name: string; courseTypeName: string; teacherId: number; teacherName: string;
  teacherAvatar: string; teacherGender: string; studentCount: number;
}
interface Session { id: number; weekday: string; sessionDate: string; timeRange: string }

export default function ClassesPage() {
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", teacherId: 1, courseTypeId: 1 });
  const [assign, setAssign] = useState({ classId: 0, studentId: 0 });

  async function load() {
    const [list, teacherList, typeList, studentList] = await Promise.all([
      api<ClassRow[]>("/api/classes"),
      api<Teacher[]>("/api/teachers"),
      api<Type[]>("/api/course-types"),
      api<Student[]>("/api/students"),
    ]);
    setRows(list);
    setTeachers(teacherList);
    setTypes(typeList);
    setStudents(studentList);
  }
  useEffect(() => { load().catch((reason) => setError(reason.message)); }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/classes", { method: "POST", body: JSON.stringify(form) });
      setOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  }

  async function place(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/classes/${assign.classId}/students`, { method: "POST", body: JSON.stringify({ studentId: assign.studentId }) });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "分班失败");
    }
  }

  async function showSessions(id: number) {
    setError("");
    setSessions(await api<Session[]>(`/api/classes/${id}/sessions`));
  }

  return (
    <>
      <div className="top"><h1>班级</h1><button onClick={() => setOpen(true)}>新增</button></div>
      {error && <p className="error">{error}</p>}
      {open && (
        <form className="panel" onSubmit={onSubmit}>
          <div className="grid">
            <label>班级名称<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>教师<select value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: Number(event.target.value) })}>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>课程类型<select value={form.courseTypeId} onChange={(event) => setForm({ ...form, courseTypeId: Number(event.target.value) })}>{types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          </div>
          <button type="submit">保存</button>
        </form>
      )}
      <form className="panel" onSubmit={place}>
        <div className="grid">
          <label>班级<select value={assign.classId} onChange={(event) => setAssign({ ...assign, classId: Number(event.target.value) })}><option value={0}>选择班级</option>{rows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>学生<select value={assign.studentId} onChange={(event) => setAssign({ ...assign, studentId: Number(event.target.value) })}><option value={0}>选择学生</option>{students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
        <button type="submit">分入班级</button>
      </form>
      <table>
        <thead><tr><th>班级名称</th><th>课程类型</th><th>教师编号</th><th>教师姓名</th><th>教师头像</th><th>教师性别</th><th>学生数量</th><th>操作</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td><td>{row.courseTypeName}</td><td>{row.teacherId}</td><td>{row.teacherName}</td>
              <td>{row.teacherAvatar || "—"}</td><td>{row.teacherGender}</td><td>{row.studentCount}</td>
              <td><button className="ghost" onClick={() => showSessions(row.id)}>课时查看</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {sessions.length > 0 && (
        <div className="panel">
          <h2>课时</h2>
          <table>
            <thead><tr><th>周几</th><th>日期</th><th>时间段</th></tr></thead>
            <tbody>{sessions.map((item) => <tr key={item.id}><td>{item.weekday}</td><td>{item.sessionDate}</td><td>{item.timeRange}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
