import { NextResponse } from "next/server";
import { generateRetentionBrief } from "@/lib/ai/retention-brief";
import {
  isLangfuseConfigured,
  isOpenAIConfigured,
} from "@/lib/ai/langfuse-client";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { customerId?: string; isDemo?: boolean };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const customerId = body.customerId?.trim();
  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "AI features are not configured on this deployment." },
      { status: 503 },
    );
  }

  if (!isLangfuseConfigured()) {
    return NextResponse.json(
      { error: "Langfuse observability is not configured on this deployment." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDemo = body.isDemo === true;

  try {
    const brief = await generateRetentionBrief({
      customerId,
      userId: user?.id,
      isDemo: isDemo || !user,
    });

    return NextResponse.json({ brief });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate brief";
    const status = message === "Customer not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
