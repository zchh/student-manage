"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Student {
  id: number; studentNo: string; name: string; gender: string; birthDate: string;
  phone: string; parentPhone: string; className: string; teacherId: number | null;
  teacherName: string; completedHours: number; remainingHours: number; low: boolean;
}

const empty = { name: "", gender: "男", birthDate: "", grade: "", phone: "", parentPhone: "" };

export default function StudentsPage() {
  const [rows, setRows] = useState<Student[]>([]);
  const [keyword, setKeyword] = useState("");
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function load(text = keyword) {
    setRows(await api<Student[]>(`/api/students?keyword=${encodeURIComponent(text)}`));
  }
  useEffect(() => { load("").catch((reason) => setError(reason.message)); }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/students", { method: "POST", body: JSON.stringify(form) });
      setForm(empty);
      setOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  }

  async function remove(id: number) {
    setError("");
    try {
      await api(`/api/students/${id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
    }
  }

  return (
    <>
      <div className="top">
        <h1>学生</h1>
        <div>
          <input placeholder="姓名或学号" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <button className="ghost" onClick={() => load().catch((reason) => setError(reason.message))}>查询</button>
          <button onClick={() => setOpen(true)}>新增</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {open && (
        <form className="panel" onSubmit={onSubmit}>
          <div className="grid">
            <label>姓名<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>性别<input value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })} /></label>
            <label>出生年月日<input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>
            <label>年级<input value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })} /></label>
            <label>联系方式<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>家长联系方式<input value={form.parentPhone} onChange={(event) => setForm({ ...form, parentPhone: event.target.value })} /></label>
          </div>
          <button type="submit">保存</button>
        </form>
      )}
      <table>
        <thead><tr><th>学生编号</th><th>学生姓名</th><th>性别</th><th>出生年月日</th><th>联系方式</th><th>家长联系方式</th><th>班级</th><th>教师编号</th><th>教师</th><th>已完成课时</th><th>剩余课时</th><th>操作</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.studentNo}</td><td>{row.name}</td><td>{row.gender}</td><td>{row.birthDate}</td>
              <td>{row.phone}</td><td>{row.parentPhone}</td><td>{row.className}</td><td>{row.teacherId ?? ""}</td>
              <td>{row.teacherName}</td><td>{row.completedHours}</td>
              <td>{row.remainingHours}{row.low && <span className="tag"> 快用完</span>}</td>
              <td><button className="danger" onClick={() => remove(row.id)}>删除</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
