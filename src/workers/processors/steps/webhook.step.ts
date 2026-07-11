import type {
  WebhookConfig,
  WorkflowContext,
} from "../../../modules/workflows/workflows.types.js";

export async function executeWebhookStep(
  config: WebhookConfig,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);

  try {
    const request: RequestInit = {
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      signal: ctrl.signal,
    };

    if (config.method !== "GET") {
      request.body = JSON.stringify(context);
    }

    const res = await fetch(config.url, request);

    const body = await res.text();

    if (res.status >= 400 && res.status < 500) {
      throw new Error(`4xx ${res.status} — not retrying`);
    }

    if (!res.ok) {
      throw new Error(`5xx ${res.status} — retrying`);
    }

    return {
      webhookStatus: res.status,
      webhookBody: body,
    };
  } finally {
    clearTimeout(timer);
  }
}