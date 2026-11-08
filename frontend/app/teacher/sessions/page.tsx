"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pager, usePager } from "@/components/Pager";
import { api } from "@/lib/api";

interface ClassRow { id: number; name: string; teacherId: number; teacherName: string }
interface Session {
  id: number; weekday: string; sessionDate: string; timeRange: string; topic: string; status: string; remark: string;
}

const empty = { weekday: "周六", sessionDate: "", timeRange: "", topic: "", remark: "" };

export default function SessionsPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState(0);
  const [rows, setRows] = useState<Session[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const pager = usePager(rows);

  async function load(id = classId) {
    const list = await api<ClassRow[]>("/api/teacher/classes");
    setClasses(list);
    const current = id || list[0]?.id || 0;
    setClassId(current);
    if (current) setRows(await api<Session[]>(`/api/teacher/classes/${current}/sessions`));
  }
  useEffect(() => { load(0).catch((reason) => setError(reason.message)); }, []);

  const current = classes.find((item) => item.id === classId);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/teacher/classes/${classId}/sessions`, { method: "POST", body: JSON.stringify(form) });
      setOpen(false);
      await load(classId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  }

  async function leave(id: number) {
    setError("");
    try {
      await api(`/api/teacher/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ status: "教师请假" }) });
      await load(classId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "修改失败");
    }
  }

  return (
    <>
      <div className="top">
        <div>
          <h1>班级课时</h1>
          {current && <p>班级名称 {current.name}　教师编号 {current.teacherId}　教师姓名 {current.teacherName}</p>}
        </div>
        <button onClick={() => setOpen(true)} disabled={!classId}>新增</button>
      </div>
      {classes.length > 1 && (
        <select value={classId} onChange={(event) => load(Number(event.target.value))}>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      )}
      {error && <p className="error">{error}</p>}
      {open && (
        <form className="panel" onSubmit={onSubmit}>
          <div className="grid">
            <label>周几<input value={form.weekday} onChange={(event) => setForm({ ...form, weekday: event.target.value })} /></label>
            <label>日期<input type="date" value={form.sessionDate} onChange={(event) => setForm({ ...form, sessionDate: event.target.value })} /></label>
            <label>时间段<input value={form.timeRange} onChange={(event) => setForm({ ...form, timeRange: event.target.value })} /></label>
            <label>课程主题<input value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} /></label>
          </div>
          <button type="submit">保存</button>
        </form>
      )}
      <table>
        <thead><tr><th>周几</th><th>日期</th><th>时间段</th><th>主题</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          {pager.slice.map((row) => (
            <tr key={row.id}>
              <td>{row.weekday}</td><td>{row.sessionDate}</td><td>{row.timeRange}</td><td>{row.topic}</td><td>{row.status}</td>
              <td>{row.status === "待上课" && <button className="ghost" onClick={() => leave(row.id)}>请假</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager {...pager} />
    </>
  );
}
