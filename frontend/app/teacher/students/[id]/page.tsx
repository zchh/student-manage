"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Facts } from "@/components/Facts";
import { Pager, usePager } from "@/components/Pager";
import { api } from "@/lib/api";

interface HistorySession {
  id: number;
  sessionDate: string;
  weekday: string;
  status: string;
  remark: string;
}

interface History {
  studentNo: string;
  name: string;
  sessions: HistorySession[];
}

export default function StudentHistoryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = Number(params.id);
  const [page, setPage] = useState<History | null>(null);
  const [error, setError] = useState("");
  const pager = usePager(page?.sessions ?? []);

  useEffect(() => {
    if (!studentId) return;
    api<History>(`/api/teacher/students/${studentId}/sessions`)
      .then(setPage)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "加载失败"));
  }, [studentId]);

  return (
    <>
      <div className="top">
        <div>
          <h1>历史课时</h1>
          {page && <Facts items={[["学生编号", page.studentNo], ["学生姓名", page.name]]} />}
        </div>
        <button className="ghost" onClick={() => router.push("/teacher/students")}>返回班级学生</button>
      </div>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>日期</th><th>周几</th><th>是否已到</th><th>备注</th></tr></thead>
        <tbody>
          {pager.slice.map((row) => (
            <tr key={row.id}>
              <td>{row.sessionDate}</td><td>{row.weekday}</td><td>{row.status}</td><td>{row.remark}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager {...pager} />
    </>
  );
}
