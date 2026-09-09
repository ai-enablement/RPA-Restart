import { NextResponse } from "next/server";
import { getUserEmail } from "@/lib/auth";
import { getAppUser, updateRpaTask } from "@/lib/rpa";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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
  if (userEmails.length === 0 || userEmails.length > 50 || userEmails.some((value) => !/^[^\s@]+@changshininc\.com$/i.test(value))) {
    return NextResponse.json({ message: "회사 이메일을 1~50개 입력해 주세요." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    return NextResponse.json(await updateRpaTask(user, id, {
      name, description, category, webhookUrl: webhookUrl || null, userEmails,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "RPA를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ message: "RPA를 수정하지 못했습니다." }, { status: 500 });
  }
}
