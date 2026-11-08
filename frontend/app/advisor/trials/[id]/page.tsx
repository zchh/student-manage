"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Facts } from "@/components/Facts";
import { Modal } from "@/components/Modal";
import { Pager, usePager } from "@/components/Pager";
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
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const trialId = Number(params.id);
  const [page, setPage] = useState<FollowUps | null>(null);
  const [writing, setWriting] = useState(false);
  const [content, setContent] = useState("");
  const [history, setHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const visitPager = usePager(page?.visits ?? []);
  const assistPager = usePager(page?.assists ?? []);

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
        <button className="ghost" onClick={() => router.push("/advisor/trials")}>返回试听课</button>
      </div>
      {error && !writing && <p className="error">{error}</p>}
      {page && (
        <section className="panel">
          <Facts items={[["学生姓名", page.studentName], ["课程类型", page.courseTypeName], ["最新AI助力信息", page.latestAssist || "暂无"]]} />
        </section>
      )}
      <div className="actions">
        <button onClick={() => { setError(""); setWriting(true); setContent(""); }}>登记回访内容</button>
        <button disabled={generating} onClick={generate}>{generating ? "生成中…" : "AI助力"}</button>
        <button className="ghost" onClick={() => setHistory((open) => !open)}>历史AI助力内容</button>
      </div>
      {writing && (
        <Modal label="登记回访内容" onClose={() => setWriting(false)}>
        <form onSubmit={onSubmit}>
          {error && <p className="error">{error}</p>}
          <label>
            回访内容
            <textarea value={content} onChange={(event) => setContent(event.target.value)} />
          </label>
          <div className="actions">
            <button type="submit">保存</button>
            <button type="button" className="ghost" onClick={() => setWriting(false)}>关闭</button>
          </div>
        </form>
        </Modal>
      )}
      {history && (
        <>
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>AI助力内容</th>
            </tr>
          </thead>
          <tbody>
            {assistPager.slice.length === 0 && (
              <tr><td colSpan={2}>暂无</td></tr>
            )}
            {assistPager.slice.map((row) => (
              <tr key={row.id}>
                <td>{time(row.createdAt)}</td>
                <td className="pre">{row.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager {...assistPager} />
        </>
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
          {visitPager.slice.map((row) => (
            <tr key={row.id}>
              <td>{time(row.createdAt)}</td>
              <td>{row.content}</td>
              <td><button className="danger" onClick={() => remove(row.id)}>删除</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager {...visitPager} />
    </>
  );
}
