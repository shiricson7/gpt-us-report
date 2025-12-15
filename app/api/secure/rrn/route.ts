import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCipheriv, createHash, randomBytes } from "node:crypto";

type Body = { rrn?: string };

function maskRrn(rrn: string) {
  const trimmed = rrn.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{6})-(\d)(\d+)$/);
  if (match) {
    const [, birth, first, rest] = match;
    return `${birth}-${first}${"*".repeat(rest.length)}`;
  }

  if (trimmed.length <= 8) return trimmed;
  return `${trimmed.slice(0, 8)}${"*".repeat(trimmed.length - 8)}`;
}

function encryptRrn(rrn: string) {
  const secret = process.env.RRN_ENCRYPTION_SECRET;
  if (!secret) throw new Error("Missing RRN_ENCRYPTION_SECRET");

  const key = createHash("sha256").update(secret, "utf8").digest(); // 32 bytes
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(rrn, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const rrn = String(body.rrn ?? "").trim();
  if (!rrn) return NextResponse.json({ rrnMasked: "", rrnEnc: "" });

  try {
    const rrnMasked = maskRrn(rrn);
    const rrnEnc = encryptRrn(rrn);
    return NextResponse.json({ rrnMasked, rrnEnc });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Encryption failed";
    return new NextResponse(message, { status: 500 });
  }
}

