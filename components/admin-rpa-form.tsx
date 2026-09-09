"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { FormEvent, useState } from "react";
import type { RpaTask } from "@/lib/types";

export function AdminRpaForm({ task, buttonLabel }: { task?: RpaTask; buttonLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(task ? `/api/admin/rpa/${task.id}` : "/api/admin/rpa", {
      method: task ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"), category: form.get("category"),
        description: form.get("description"), webhookUrl: form.get("webhookUrl"),
        userEmails: form.get("userEmails"),
      }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(result?.message ?? (task ? "수정하지 못했습니다." : "등록하지 못했습니다."));
      setSaving(false);
      return;
    }
    window.location.reload();
  }

  if (!open) return <button className={task ? "admin-edit-button" : "admin-add-button"} onClick={() => setOpen(true)}>{!task && <PlusIcon />}{buttonLabel ?? (task ? "수정" : "새 RPA 등록")}</button>;

  return (
    <div className="admin-form-wrap">
      <div className="admin-form-heading"><div><strong>{task ? "RPA 수정" : "새 RPA 등록"}</strong><span>Flow URL과 사용자를 함께 관리합니다.</span></div><button aria-label="닫기" onClick={() => setOpen(false)}><XMarkIcon /></button></div>
      <form className="admin-form" onSubmit={submit}>
        <label>RPA 이름<input name="name" maxLength={120} required defaultValue={task?.name} /></label>
        <label>분류<input name="category" maxLength={80} placeholder="예: Finance" required defaultValue={task?.category} /></label>
        <label className="wide">설명<textarea name="description" maxLength={500} rows={3} defaultValue={task?.description} /></label>
        <label className="wide">사용자 이메일<textarea name="userEmails" rows={3} required defaultValue={task?.assignedUserEmails?.join("\n")} placeholder={"user1@changshininc.com\nuser2@changshininc.com"} /><span className="field-help">여러 명은 줄바꿈 또는 쉼표로 구분하세요.</span></label>
        <label className="wide">Power Automate Flow URL<input name="webhookUrl" type="url" placeholder="https://..." defaultValue={task?.webhookUrl ?? ""} /></label>
        {message && <p className="form-error">{message}</p>}
        <button className="save-button" disabled={saving}>{saving ? "저장 중" : task ? "저장" : "등록"}</button>
      </form>
    </div>
  );
}
