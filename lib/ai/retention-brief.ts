import OpenAI from "openai";
import {
  buildTimelineEvents,
  confidenceSummary,
  deriveRiskDrivers,
} from "@/lib/customer-health";
import { getLangfuse } from "@/lib/ai/langfuse-client";
import {
  formatChurnImpact,
  playbookRecommendation,
  playbookRecommendationLabel,
} from "@/lib/playbook-recommendation";
import {
  getCustomerById,
  getCustomerPayments,
  getCustomerSupport,
  getCustomerUsage,
} from "@/lib/queries/customers";
import { getTopPlaybooksForSegment } from "@/lib/queries/playbooks";
import { getRiskLevel, riskLabel } from "@/lib/risk";

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a senior Customer Success analyst at a B2B SaaS company.
Write a concise retention brief for a CSM who has 2 minutes before a customer call.

Rules:
- Use only facts from the provided JSON context. Do not invent metrics or events.
- Be direct, professional, and actionable — not salesy.
- Structure with markdown: **Situation**, **Risk drivers**, **Recommended action**, **Talking points** (3 bullets max).
- If risk is high, recommend urgency and a specific playbook from context when available.
- Mention model uncertainty briefly if confidence intervals are wide or data is thin.
- Keep total length under 220 words.`;

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

export async function buildRetentionBriefContext(customerId: string) {
  const customer = await getCustomerById(customerId);
  if (!customer) return null;

  const [usage, payments, support, playbooks] = await Promise.all([
    getCustomerUsage(customerId),
    getCustomerPayments(customerId),
    getCustomerSupport(customerId),
    getTopPlaybooksForSegment(customer.segment, 3),
  ]);

  const paymentFailures = payments.filter(
    (p) =>
      p.event_type === "payment_failed" || p.event_type === "invoice_past_due",
  ).length;
  const negativeTickets = support.filter((s) => s.sentiment === "negative").length;

  const riskDrivers = deriveRiskDrivers(customer, usage, {
    paymentFailures,
    negativeTickets,
  });
  const timeline = buildTimelineEvents(payments, support, usage).slice(0, 5);
  const uncertainty = confidenceSummary(customer);

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      segment: customer.segment,
      plan_tier: customer.plan_tier,
      industry: customer.industry,
      mrr: customer.mrr,
      cohort_month: customer.cohort_month,
      signup_date: customer.signup_date,
      risk_band: riskLabel(getRiskLevel(customer.churn_risk_30d)),
      churn_risk_30d_pct: Math.round(customer.churn_risk_30d * 100),
      churn_risk_90d_pct: Math.round(customer.churn_risk_90d * 100),
      median_days_to_churn: customer.median_days_to_churn,
      confidence: customer.confidence_interval,
    },
    uncertainty,
    risk_drivers: riskDrivers.map((d) => ({
      label: d.label,
      detail: d.detail,
      severity: d.severity,
    })),
    recent_events: timeline.map((e) => ({
      date: e.date,
      title: e.title,
      detail: e.detail,
    })),
    recommended_playbooks: playbooks.map((pb) => ({
      name: pb.label,
      action: pb.action,
      effect: formatChurnImpact(pb.ate),
      recommendation: playbookRecommendationLabel(playbookRecommendation(pb)),
    })),
  };
}

export async function generateRetentionBrief(options: {
  customerId: string;
  userId?: string;
  isDemo?: boolean;
}): Promise<string> {
  const context = await buildRetentionBriefContext(options.customerId);
  if (!context) {
    throw new Error("Customer not found");
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Generate a retention brief for this account:\n\n${JSON.stringify(context, null, 2)}`,
    },
  ];

  const langfuse = getLangfuse();
  const trace = langfuse?.trace({
    name: "retention-brief",
    userId: options.userId ?? (options.isDemo ? "demo" : "anonymous"),
    sessionId: `customer-${options.customerId}`,
    metadata: {
      customerId: options.customerId,
      customerName: context.customer.name,
      segment: context.customer.segment,
      riskBand: context.customer.risk_band,
      isDemo: options.isDemo ?? false,
    },
    tags: ["retention-brief", options.isDemo ? "demo" : "auth"],
  });

  const generation = trace?.generation({
    name: "openai-chat",
    model: MODEL,
    input: messages,
  });

  const openai = getOpenAI();
  const started = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 450,
    });

    const brief = completion.choices[0]?.message?.content?.trim();
    if (!brief) {
      throw new Error("Empty response from language model");
    }

    generation?.end({
      output: brief,
      model: completion.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      },
      metadata: { latencyMs: Date.now() - started },
    });

    trace?.update({ output: brief });

    return brief;
  } catch (error) {
    generation?.end({
      level: "ERROR",
      statusMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  } finally {
    await langfuse?.flushAsync();
  }
}
