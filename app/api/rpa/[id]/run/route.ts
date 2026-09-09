import { NextResponse } from "next/server";
import { getUserEmail } from "@/lib/auth";
import { requestRun } from "@/lib/rpa";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const email = await getUserEmail();
  if (!email) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  if (process.env.USE_DEMO_DATA === "true") {
    return NextResponse.json({ id: crypto.randomUUID(), status: "queued" }, { status: 202 });
  }

  try {
    const { id } = await context.params;
    const run = await requestRun(email, id);
    return NextResponse.json({ ...run, status: "queued" }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "FORBIDDEN") {
      return NextResponse.json({ message: "이 과제를 실행할 권한이 없습니다." }, { status: 403 });
    }
    if (message === "FLOW_URL_MISSING") {
      return NextResponse.json({ message: "Power Automate Flow URL이 등록되지 않았습니다." }, { status: 400 });
    }
    if (message.startsWith("FLOW_HTTP_401") || message.startsWith("FLOW_HTTP_403")) {
      return NextResponse.json({ message: "Power Automate가 호출을 거부했습니다. HTTP 트리거 인증 설정을 확인해 주세요." }, { status: 502 });
    }
    if (message.includes("TimeoutError") || message.includes("aborted")) {
      return NextResponse.json({ message: "Power Automate 응답 시간이 초과되었습니다." }, { status: 504 });
    }
    return NextResponse.json({ message: "Power Automate 호출에 실패했습니다." }, { status: 502 });
  }
}
