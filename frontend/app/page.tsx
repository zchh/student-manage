"use client";

import { FormEvent, useState } from "react";
import { API, type User } from "@/lib/api";

export default function LoginPage() {
  const [account, setAccount] = useState("advisor");
  const [password, setPassword] = useState("advisor123");
  const [role, setRole] = useState<"advisor" | "teacher">("advisor");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password, role }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "登录失败");
      return;
    }
    localStorage.setItem("token", body.token);
    localStorage.setItem("user", JSON.stringify(body.user as User));
    location.href = body.user.role === "advisor" ? "/advisor/trials" : "/teacher/sessions";
  }

  return (
    <form className="panel login" onSubmit={onSubmit}>
      <h1>学生管理</h1>
      <p>顾问账号 advisor / advisor123，教师账号 teacher / teacher123。</p>
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        <label>账号<input value={account} onChange={(event) => setAccount(event.target.value)} /></label>
        <label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>
          角色
          <select value={role} onChange={(event) => setRole(event.target.value as "advisor" | "teacher")}>
            <option value="advisor">顾问</option>
            <option value="teacher">教师</option>
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">登录</button>
      </div>
    </form>
  );
}
