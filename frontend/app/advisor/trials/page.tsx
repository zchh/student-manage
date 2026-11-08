"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pager, usePager } from "@/components/Pager";
import { api } from "@/lib/api";

interface Option { id: number; name: string; courseTypeId?: number }
interface Trial {
  id: number;
  advisorId: number;
  advisorName: string;
  teacherId: number;
  teacherName: string;
  courseTypeId: number;
  courseTypeName: string;
  timeRange: string;
  studentName: string;
  gender: string;
  birthDate: string;
  phone: string;
  parentPhone: string;
  bought: boolean;
  remark: string;
  opinion: string;
  plannedEnrollDate: string;
  createdAt: string;
}

const empty = {
  teacherId: 1, courseTypeId: 1, timeRange: "", studentName: "", gender: "男", birthDate: "",
  phone: "", parentPhone: "", bought: false, remark: "", opinion: "", plannedEnrollDate: "",
};

function toForm(row: Trial): typeof empty {
  return {
    teacherId: row.teacherId,
    courseTypeId: row.courseTypeId,
    timeRange: row.timeRange,
    studentName: row.studentName,
    gender: row.gender,
    birthDate: row.birthDate,
    phone: row.phone,
    parentPhone: row.parentPhone,
    bought: row.bought,
    remark: row.remark,
    opinion: row.opinion ?? "",
    plannedEnrollDate: row.plannedEnrollDate,
  };
}

export default function TrialsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Trial[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [types, setTypes] = useState<Option[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const pager = usePager(rows);

  async function load() {
    const [list, teacherList, typeList] = await Promise.all([
      api<Trial[]>("/api/trials"),
      api<Option[]>("/api/teachers"),
      api<Option[]>("/api/course-types"),
    ]);
    setRows(list);
    setTeachers(teacherList);
    setTypes(typeList);
  }
  useEffect(() => { load().catch((reason) => setError(reason.message)); }, []);

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const path = editing ? `/api/trials/${editing}` : "/api/trials";
      await api(path, { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
      setOpen(false);
      setEditing(null);
      setForm(empty);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  }

  return (
    <>
      <div className="top">
        <h1>试听课</h1>
        <button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>新增</button>
      </div>
      {error && <p className="error">{error}</p>}
      {open && (
        <form className="panel" onSubmit={onSubmit}>
          <div className="grid">
            <label>教师<select value={form.teacherId} onChange={(event) => set("teacherId", Number(event.target.value))}>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>课程类型<select value={form.courseTypeId} onChange={(event) => set("courseTypeId", Number(event.target.value))}>{types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>试听时间段<input value={form.timeRange} onChange={(event) => set("timeRange", event.target.value)} /></label>
            <label>学生姓名<input value={form.studentName} onChange={(event) => set("studentName", event.target.value)} /></label>
            <label>性别<input value={form.gender} onChange={(event) => set("gender", event.target.value)} /></label>
            <label>出生年月日<input type="date" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} /></label>
            <label>联系方式<input value={form.phone} onChange={(event) => set("phone", event.target.value)} /></label>
            <label>家长联系方式<input value={form.parentPhone} onChange={(event) => set("parentPhone", event.target.value)} /></label>
            <label>是否已买课<select value={String(form.bought)} onChange={(event) => set("bought", event.target.value === "true") }><option value="false">否</option><option value="true">是</option></select></label>
            <label>备注<input value={form.remark} onChange={(event) => set("remark", event.target.value)} placeholder="没买课的原因" /></label>
            <label>意见<input value={form.opinion} onChange={(event) => set("opinion", event.target.value)} /></label>
            <label>计划报名时间<input type="date" value={form.plannedEnrollDate} onChange={(event) => set("plannedEnrollDate", event.target.value)} /></label>
          </div>
          <p><button type="submit">保存</button></p>
        </form>
      )}
      <table>
        <thead>
          <tr>{["顾问编号","顾问姓名","教师编号","教师姓名","课程类型","试听时间段","学生姓名","性别","出生年月日","联系方式","家长联系方式","是否已买课","备注","计划报名时间","时间","操作"].map((item) => <th key={item}>{item}</th>)}</tr>
        </thead>
        <tbody>
          {pager.slice.map((row) => (
            <tr key={row.id}>
              <td>{row.advisorId}</td><td>{row.advisorName}</td><td>{row.teacherId}</td><td>{row.teacherName}</td>
              <td>{row.courseTypeName}</td><td>{row.timeRange}</td><td>{row.studentName}</td><td>{row.gender}</td>
              <td>{row.birthDate}</td><td>{row.phone}</td><td>{row.parentPhone}</td><td>{row.bought ? "是" : "否"}</td>
              <td>{row.remark}</td><td>{row.plannedEnrollDate}</td><td>{row.createdAt.slice(0, 16).replace("T", " ")}</td>
              <td>
                <button className="ghost" onClick={() => { setEditing(row.id); setForm(toForm(row)); setOpen(true); }}>编辑</button>
                <button className="ghost" onClick={() => router.push(`/advisor/trials/${row.id}`)}>回访记录</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager {...pager} />
    </>
  );
}
