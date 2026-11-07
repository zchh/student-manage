"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ClassRow { id: number; name: string }
interface Student {
  studentNo: string; name: string; gender: string; birthDate: string; phone: string; parentPhone: string;
  advisorId: number | null; advisorName: string; completedHours: number; remainingHours: number; low: boolean;
}

export default function TeacherStudentsPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState(0);
  const [rows, setRows] = useState<Student[]>([]);
  const [error, setError] = useState("");

  async function load(id = classId) {
    const list = await api<ClassRow[]>("/api/teacher/classes");
    setClasses(list);
    const current = id || list[0]?.id || 0;
    setClassId(current);
    if (current) setRows(await api<Student[]>(`/api/teacher/classes/${current}/students`));
  }
  useEffect(() => { load(0).catch((reason) => setError(reason.message)); }, []);

  return (
    <>
      <div className="top">
        <h1>班级学生</h1>
        <select value={classId} onChange={(event) => load(Number(event.target.value)).catch((reason) => setError(reason.message))}>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>学生编号</th><th>学生姓名</th><th>性别</th><th>出生年月日</th><th>联系方式</th><th>家长联系方式</th><th>顾问编号</th><th>顾问姓名</th><th>已完成课时</th><th>剩余课时</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentNo}>
              <td>{row.studentNo}</td><td>{row.name}</td><td>{row.gender}</td><td>{row.birthDate}</td>
              <td>{row.phone}</td><td>{row.parentPhone}</td><td>{row.advisorId}</td><td>{row.advisorName}</td>
              <td>{row.completedHours}</td><td>{row.remainingHours}{row.low && <span className="tag"> 快用完</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
