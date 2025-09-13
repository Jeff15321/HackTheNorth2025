import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const items = await db.collection("character_1_entries").find({}).sort({ _id: -1 }).toArray();
    return NextResponse.json({ ok: true, items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }
    const { text } = body as { text?: string };
    if (!text || typeof text !== "string") {
      return NextResponse.json({ ok: false, error: "Missing text" }, { status: 400 });
    }
    const db = await getDb();
    const doc = { text, createdAt: new Date() };
    await db.collection("character_1_entries").insertOne(doc);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}


