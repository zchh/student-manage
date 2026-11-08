"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pager, usePager } from "@/components/Pager";
import { api } from "@/lib/api";

interface TrialOption {
  id: number; studentName: string; phone: string; bought: boolean;
  courseTypeId: number; courseTypeName: string;
}
interface Purchase {
  id: number; studentName: string; advisorId: number; advisorName: string;
  amount: number; courseTypeName: string; hours: number; createdAt: string;
}

function trialLabel(item: TrialOption) {
  return `${item.studentName}-${item.phone}`;
}

export default function PurchasesPage() {
  const [rows, setRows] = useState<Purchase[]>([]);
  const [trials, setTrials] = useState<TrialOption[]>([]);
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ trialId: 0, amount: "", hours: 4 });
  const pager = usePager(rows);
  const unpaid = trials.filter((item) => !item.bought);
  const selected = unpaid.find((item) => item.id === form.trialId);

  async function load(text = keyword) {
    const [list, trialList] = await Promise.all([
      api<Purchase[]>(`/api/purchases?keyword=${encodeURIComponent(text)}`),
      api<TrialOption[]>("/api/trials"),
    ]);
    setRows(list);
    setTrials(trialList);
  }
  useEffect(() => { load("").catch((reason) => setError(reason.message)); }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (!form.trialId || !selected) {
        setError("没有未买课的试听学生");
        return;
      }
      const amount = Number(form.amount);
      if (!Number.isInteger(amount) || amount <= 0) {
        setError("消费金额必须是正整数");
        return;
      }
      await api("/api/purchases", {
        method: "POST",
        body: JSON.stringify({ trialId: selected.id, amount, courseTypeId: selected.courseTypeId, hours: form.hours }),
      });
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
          <button onClick={() => {
            const first = unpaid[0];
            setForm({ trialId: first?.id ?? 0, amount: "", hours: 4 });
            setOpen(true);
          }}>新增</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {open && (
        <form className="panel" onSubmit={onSubmit}>
          <div className="grid">
            <label>学生<select value={form.trialId} onChange={(event) => setForm({ ...form, trialId: Number(event.target.value) })}>{unpaid.map((item) => <option key={item.id} value={item.id}>{trialLabel(item)}</option>)}</select></label>
            <label>消费金额<input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
            <label>课程类型<input value={selected?.courseTypeName ?? ""} readOnly /></label>
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
