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
    return NextResponse.json({ message: "실행 요청을 접수하지 못했습니다." }, { status: 502 });
  }
}
