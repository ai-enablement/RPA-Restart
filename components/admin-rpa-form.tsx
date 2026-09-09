"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { FormEvent, useState } from "react";

export function AdminRpaForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/rpa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"), category: form.get("category"),
        description: form.get("description"), webhookUrl: form.get("webhookUrl"),
      }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(result?.message ?? "등록하지 못했습니다.");
      setSaving(false);
      return;
    }
    window.location.reload();
  }

  if (!open) return <button className="admin-add-button" onClick={() => setOpen(true)}><PlusIcon />새 RPA 등록</button>;

  return (
    <div className="admin-form-wrap">
      <div className="admin-form-heading"><div><strong>새 RPA 등록</strong><span>Flow URL은 나중에 입력해도 됩니다.</span></div><button aria-label="닫기" onClick={() => setOpen(false)}><XMarkIcon /></button></div>
      <form className="admin-form" onSubmit={submit}>
        <label>RPA 이름<input name="name" maxLength={120} required /></label>
        <label>분류<input name="category" maxLength={80} placeholder="예: Finance" required /></label>
        <label className="wide">설명<textarea name="description" maxLength={500} rows={3} /></label>
        <label className="wide">Power Automate Flow URL<input name="webhookUrl" type="url" placeholder="https://..." /></label>
        {message && <p className="form-error">{message}</p>}
        <button className="save-button" disabled={saving}>{saving ? "등록 중" : "등록"}</button>
      </form>
    </div>
  );
}
