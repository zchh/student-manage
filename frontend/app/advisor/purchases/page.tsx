"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pager, usePager } from "@/components/Pager";
import { api } from "@/lib/api";

interface Student { id: number; name: string }
interface Type { id: number; name: string }
interface Purchase {
  id: number; studentName: string; advisorId: number; advisorName: string;
  amount: number; courseTypeName: string; hours: number; createdAt: string;
}

export default function PurchasesPage() {
  const [rows, setRows] = useState<Purchase[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ studentId: 0, amount: 0, courseTypeId: 1, hours: 4 });
  const pager = usePager(rows);

  async function load(text = keyword) {
    const [list, studentList, typeList] = await Promise.all([
      api<Purchase[]>(`/api/purchases?keyword=${encodeURIComponent(text)}`),
      api<Student[]>("/api/students"),
      api<Type[]>("/api/course-types"),
    ]);
    setRows(list);
    setStudents(studentList);
    setTypes(typeList);
    if (!form.studentId && studentList[0]) setForm((current) => ({ ...current, studentId: studentList[0].id, courseTypeId: typeList[0]?.id ?? 1 }));
  }
  useEffect(() => { load("").catch((reason) => setError(reason.message)); }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/purchases", { method: "POST", body: JSON.stringify(form) });
      setOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  }

  return (
    <>
      <div className="top">
        <h1>消费记录</h1>
        <div>
          <input placeholder="学生姓名" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <button className="ghost" onClick={() => load().catch((reason) => setError(reason.message))}>查询</button>
          <button onClick={() => setOpen(true)}>新增</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {open && (
        <form className="panel" onSubmit={onSubmit}>
          <div className="grid">
            <label>学生<select value={form.studentId} onChange={(event) => setForm({ ...form, studentId: Number(event.target.value) })}>{students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>消费金额<input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /></label>
            <label>课程类型<select value={form.courseTypeId} onChange={(event) => setForm({ ...form, courseTypeId: Number(event.target.value) })}>{types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>课时<input type="number" value={form.hours} onChange={(event) => setForm({ ...form, hours: Number(event.target.value) })} /></label>
          </div>
          <button type="submit">保存</button>
        </form>
      )}
      <table>
        <thead><tr><th>学生姓名</th><th>顾问编号</th><th>顾问姓名</th><th>消费金额</th><th>课程类型</th><th>课时</th><th>时间</th></tr></thead>
        <tbody>
          {pager.slice.map((row) => (
            <tr key={row.id}><td>{row.studentName}</td><td>{row.advisorId}</td><td>{row.advisorName}</td><td>{row.amount}</td><td>{row.courseTypeName}</td><td>{row.hours}</td><td>{row.createdAt.slice(0, 16).replace("T", " ")}</td></tr>
          ))}
        </tbody>
      </table>
      <Pager {...pager} />
    </>
  );
}
