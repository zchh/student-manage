"use client";

import { useEffect, useState } from "react";

export function usePager<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  return {
    slice: items.slice(start, start + pageSize),
    page: current,
    pages,
    total,
    pageSize,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(Math.max(1, size));
      setPage(1);
    },
  };
}

export function Pager(props: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}) {
  const { page, pages, total, pageSize, setPage, setPageSize } = props;
  const [draft, setDraft] = useState(String(page));
  const [sizeDraft, setSizeDraft] = useState(String(pageSize));

  useEffect(() => { setDraft(String(page)); }, [page]);
  useEffect(() => { setSizeDraft(String(pageSize)); }, [pageSize]);

  function jump() {
    const value = Number(draft);
    if (!Number.isInteger(value) || value < 1) return;
    setPage(Math.min(value, pages));
  }

  function applySize() {
    const size = Number(sizeDraft);
    if (!Number.isInteger(size) || size < 1) {
      setSizeDraft(String(pageSize));
      return;
    }
    setPageSize(size);
  }

  return (
    <div className="pager">
      <span>第 {page} / {pages} 页，共 {total} 条</span>
      <button type="button" className="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
      <button type="button" className="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>下一页</button>
      <label>
        页码
        <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); jump(); } }} />
      </label>
      <button type="button" className="ghost" onClick={jump}>跳转</button>
      <label>
        每页条数
        <input type="number" min={1} value={sizeDraft} onChange={(event) => setSizeDraft(event.target.value)} onBlur={applySize} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applySize(); } }} />
      </label>
    </div>
  );
}
