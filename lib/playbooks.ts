/** Human-readable metadata for causal_estimates.treatment keys. */
export const PLAYBOOK_META: Record<
  string,
  { label: string; description: string; action: string }
> = {
  proactive_success_call: {
    label: "Proactive success call",
    description:
      "Dedicated CSM outreach for accounts with support friction and declining engagement.",
    action: "Schedule a success call within 7 days and review open support themes.",
  },
  payment_recovery_workflow: {
    label: "Payment recovery workflow",
    description:
      "Automated dunning and billing remediation after failed payments.",
    action: "Trigger payment recovery sequence and confirm billing contact.",
  },
  onboarding_relaunch: {
    label: "Onboarding relaunch",
    description:
      "Guided re-onboarding for early-tenure accounts with low product adoption.",
    action: "Enroll in a 14-day onboarding relaunch with milestone check-ins.",
  },
  expansion_discount: {
    label: "Expansion discount",
    description:
      "Short-term pricing relief for downgraded or declining-usage accounts.",
    action: "Offer a time-boxed discount tied to usage recovery goals.",
  },
};

export function playbookLabel(treatment: string): string {
  return PLAYBOOK_META[treatment]?.label ?? treatment.replace(/_/g, " ");
}

export function playbookAction(treatment: string): string {
  return (
    PLAYBOOK_META[treatment]?.action ??
    "Review account context and apply the recommended intervention."
  );
}
