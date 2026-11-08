"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface Note {
  id: number;
  content: string;
  createdAt: string;
}

interface FollowUps {
  studentName: string;
  courseTypeName: string;
  latestAssist: string;
  assists: Note[];
  visits: Note[];
}

function time(value: string) {
  return value.slice(0, 16).replace("T", " ");
}

export default function TrialFollowUpPage() {
  const params = useParams<{ id: string }>();
  const trialId = Number(params.id);
  const [page, setPage] = useState<FollowUps | null>(null);
  const [writing, setWriting] = useState(false);
  const [content, setContent] = useState("");
  const [history, setHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setPage(await api<FollowUps>(`/api/trials/${trialId}/follow-ups`));
  }

  useEffect(() => {
    if (!trialId) return;
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "加载失败"));
  }, [trialId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/trials/${trialId}/visits`, { method: "POST", body: JSON.stringify({ content }) });
      setContent("");
      setWriting(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  }

  async function generate() {
    setError("");
    setGenerating(true);
    try {
      await api(`/api/trials/${trialId}/assists`, { method: "POST", body: "{}" });
      setHistory(true);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  async function remove(id: number) {
    setError("");
    try {
      await api(`/api/trials/${trialId}/visits/${id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
    }
  }

  return (
    <>
      <div className="top">
        <h1>回访记录</h1>
        <button className="ghost" onClick={() => { location.href = "/advisor/trials"; }}>返回试听课</button>
      </div>
      {error && <p className="error">{error}</p>}
      {page && (
        <section className="panel">
          <p>学生姓名：{page.studentName}</p>
          <p>课程类型：{page.courseTypeName}</p>
          <p className="pre">最新AI助力信息：{page.latestAssist || "暂无"}</p>
        </section>
      )}
      <div className="actions">
        <button onClick={() => { setWriting(true); setContent(""); }}>登记回访内容</button>
        <button disabled={generating} onClick={generate}>{generating ? "生成中…" : "AI助力"}</button>
        <button className="ghost" onClick={() => setHistory((open) => !open)}>历史AI助力内容</button>
      </div>
      {writing && (
        <form className="panel" onSubmit={onSubmit}>
          <label>
            回访内容
            <textarea value={content} onChange={(event) => setContent(event.target.value)} />
          </label>
          <p><button type="submit">保存</button></p>
        </form>
      )}
      {history && (
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>AI助力内容</th>
            </tr>
          </thead>
          <tbody>
            {page?.assists.length === 0 && (
              <tr><td colSpan={2}>暂无</td></tr>
            )}
            {page?.assists.map((row) => (
              <tr key={row.id}>
                <td>{time(row.createdAt)}</td>
                <td className="pre">{row.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <table>
        <thead>
          <tr>
            <th>时间</th>
            <th>回访内容</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {page?.visits.map((row) => (
            <tr key={row.id}>
              <td>{time(row.createdAt)}</td>
              <td>{row.content}</td>
              <td><button className="danger" onClick={() => remove(row.id)}>删除</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
