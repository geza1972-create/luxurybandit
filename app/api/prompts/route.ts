import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";

// Card Studio prompt library (image + video generation prompts). Admin only.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const state = await readTryThisLookState();
  return NextResponse.json({ prompts: state.promptLibrary ?? [] });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { add?: { kind?: "image" | "video" | "voice"; text?: string }; remove?: string };
  const state = await readTryThisLookState();
  let prompts = [...(state.promptLibrary ?? [])];

  if (body.add?.text?.trim()) {
    const text = body.add.text.trim().slice(0, 2000);
    const kind = body.add.kind === "video" ? "video" : body.add.kind === "voice" ? "voice" : "image";
    // Avoid duplicates of the same text+kind.
    if (!prompts.some(p => p.kind === kind && p.text === text)) {
      prompts.push({ id: crypto.randomUUID(), kind, text, createdAt: new Date().toISOString() });
    }
  } else if (body.remove) {
    prompts = prompts.filter(p => p.id !== body.remove);
  } else {
    return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
  }

  state.promptLibrary = prompts.slice(0, 500);
  await saveTryThisLookState(state, body.remove ? { deletedPromptIds: [body.remove] } : {});
  return NextResponse.json({ ok: true, prompts: state.promptLibrary });
}
