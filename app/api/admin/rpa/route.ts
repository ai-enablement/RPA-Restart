import { NextResponse } from "next/server";
import { getUserEmail } from "@/lib/auth";
import { createRpaTask, getAppUser } from "@/lib/rpa";

export async function POST(request: Request) {
  const email = await getUserEmail();
  if (!email) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const user = await getAppUser(email);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";
  const webhookUrl = typeof body?.webhookUrl === "string" ? body.webhookUrl.trim() : "";
  const userEmails = typeof body?.userEmails === "string"
    ? [...new Set(body.userEmails.split(/[\s,;]+/).map((value) => value.trim().toLowerCase()).filter(Boolean))]
    : [];

  if (!name || name.length > 120 || description.length > 500 || !category || category.length > 80) {
    return NextResponse.json({ message: "입력값을 확인해 주세요." }, { status: 400 });
  }
  if (webhookUrl && !URL.canParse(webhookUrl)) {
    return NextResponse.json({ message: "Flow URL 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (
    userEmails.length === 0 || userEmails.length > 50 ||
    userEmails.some((email) => !/^[^\s@]+@changshininc\.com$/i.test(email))
  ) {
    return NextResponse.json({ message: "회사 이메일을 1~50개 입력해 주세요." }, { status: 400 });
  }

  try {
    const task = await createRpaTask(user, { name, description, category, webhookUrl: webhookUrl || null, userEmails });
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ message: "RPA를 등록하지 못했습니다." }, { status: 500 });
  }
}
