"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pager, usePager } from "@/components/Pager";
import { api } from "@/lib/api";

interface ClassRow { id: number; name: string; teacherId: number; teacherName: string }
interface Session {
  id: number; weekday: string; sessionDate: string; timeRange: string; topic: string; status: string; remark: string;
}

const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
const empty = { sessionDate: "", weekday: "", startHour: "10", startMinute: "00", endHour: "11", endMinute: "00", topic: "", remark: "" };

function weekdayOf(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return weekdays[new Date(year, month - 1, day).getDay()];
}

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
      if (!form.sessionDate || !form.weekday) {
        setError("请选择日期");
        return;
      }
      const start = `${form.startHour}:${form.startMinute}`;
      const end = `${form.endHour}:${form.endMinute}`;
      if (start >= end) {
        setError("结束时间要晚于开始时间");
        return;
      }
      await api(`/api/teacher/classes/${classId}/sessions`, {
        method: "POST",
        body: JSON.stringify({
          weekday: form.weekday,
          sessionDate: form.sessionDate,
          timeRange: `${start}-${end}`,
          topic: form.topic,
          remark: form.remark,
        }),
      });
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

  async function remove(id: number) {
    setError("");
    try {
      await api(`/api/teacher/sessions/${id}`, { method: "DELETE" });
      await load(classId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
    }
  }

  return (
    <>
      <div className="top">
        <div>
          <h1>班级课时</h1>
          {current && <p>班级名称 {current.name}　教师编号 {current.teacherId}　教师姓名 {current.teacherName}</p>}
        </div>
        <button onClick={() => { setForm(empty); setOpen(true); }} disabled={!classId}>新增</button>
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
            <label>日期<input type="date" value={form.sessionDate} onChange={(event) => setForm({ ...form, sessionDate: event.target.value, weekday: weekdayOf(event.target.value) })} /></label>
            <label>周几<input value={form.weekday} readOnly /></label>
            <label className="time-range">时间段
              <span className="time-part">
                <select value={form.startHour} onChange={(event) => setForm({ ...form, startHour: event.target.value })}>{hours.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                时
                <select value={form.startMinute} onChange={(event) => setForm({ ...form, startMinute: event.target.value })}>{minutes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                分到
              </span>
              <span className="time-part">
                <select value={form.endHour} onChange={(event) => setForm({ ...form, endHour: event.target.value })}>{hours.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                时
                <select value={form.endMinute} onChange={(event) => setForm({ ...form, endMinute: event.target.value })}>{minutes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                分
              </span>
            </label>
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
              <td>
                {row.status === "待上课" && <button className="ghost" onClick={() => leave(row.id)}>请假</button>}
                <button className="danger" onClick={() => remove(row.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager {...pager} />
    </>
  );
}
