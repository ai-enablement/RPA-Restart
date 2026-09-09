"use client";

import { ArrowPathIcon, PlayIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

export function RunButton({ taskId, disabled }: { taskId: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function run() {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch(`/api/rpa/${taskId}/run`, { method: "POST" });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(result?.message ?? "실행 요청에 실패했습니다.");
      setState("done");
      window.setTimeout(() => setState("idle"), 4000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "실행 요청에 실패했습니다.");
      setState("error");
    }
  }

  return (
    <div className="run-control"><button className="run-button" onClick={run} disabled={disabled || state === "loading"} title={message}>
      {state === "loading" ? <ArrowPathIcon className="spin" /> : <PlayIcon />}
      {state === "loading" ? "요청 중" : state === "done" ? "실행 요청됨" : state === "error" ? "다시 시도" : "실행"}
    </button>{message && <span className="run-error">{message}</span>}</div>
  );
}
