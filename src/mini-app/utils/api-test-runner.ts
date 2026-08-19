import { invokeFetchClient, type FetchClientResult } from "./fetch-client";
import type { ApiPath, Integration } from "@/mini-app/types/mini-app.types";

export type ApiConsoleTestInput = {
  integration: Integration;
  path: ApiPath;
  params?: Record<string, unknown>;
  credentialValue?: string;
};

export type ApiConsoleTestReport = {
  status: "passed" | "failed";
  reasons: string[];
  result: FetchClientResult;
};

function validateConsoleInput(input: Partial<ApiConsoleTestInput>): string[] {
  const reasons: string[] = [];

  if (!input.integration) {
    reasons.push("Missing integration definition.");
  } else {
    if (!input.integration.id) reasons.push("Integration is missing id.");
    if (!input.integration.name) reasons.push("Integration is missing name.");
    if (!input.integration.baseUrl) reasons.push("Integration is missing baseUrl.");
    if (!input.integration.authConfig?.type) reasons.push("Integration is missing authConfig.type.");
  }

  if (!input.path) {
    reasons.push("Missing API path definition.");
  } else {
    if (!input.path.id) reasons.push("API path is missing id.");
    if (!input.path.name) reasons.push("API path is missing name.");
    if (!input.path.integrationId) reasons.push("API path is missing integrationId.");
    if (!input.path.path) reasons.push("API path is missing path.");
    if (!input.path.method) reasons.push("API path is missing method.");
    if (!Array.isArray(input.path.requestSchema)) reasons.push("API path requestSchema must be an array.");
    if (!Array.isArray(input.path.responseSchema)) reasons.push("API path responseSchema must be an array.");
  }

  if (input.integration && input.path && input.path.integrationId !== input.integration.id) {
    reasons.push(
      `API path integrationId "${input.path.integrationId}" does not match integration id "${input.integration.id}".`,
    );
  }

  return reasons;
}

export async function runApiConsoleTest(input: ApiConsoleTestInput): Promise<ApiConsoleTestReport> {
  const inputErrors = validateConsoleInput(input);
  if (inputErrors.length > 0) {
    return {
      status: "failed",
      reasons: inputErrors,
      result: {
        success: false,
        status: 400,
        error: "Invalid console test input",
        validationErrors: inputErrors,
      },
    };
  }

  const result = await invokeFetchClient(
    input.integration,
    input.path,
    input.params ?? {},
    input.credentialValue,
  );

  const reasons: string[] = [];
  if (result.success) {
    reasons.push(`Request completed successfully with HTTP status ${result.status}.`);
    if (input.path.responseSchema.length > 0) {
      reasons.push(`Response matched ${input.path.responseSchema.length} declared response schema field(s).`);
    }
  } else {
    reasons.push(result.error || "Request failed.");
    for (const error of result.validationErrors ?? []) {
      reasons.push(error);
    }
  }

  return {
    status: result.success ? "passed" : "failed",
    reasons,
    result,
  };
}
