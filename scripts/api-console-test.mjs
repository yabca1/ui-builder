import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { invokeFetchClient } from "../src/mini-app/utils/fetch-client.ts";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: pnpm test:api <path-to-api-test.json>");
  process.exitCode = 1;
} else {
  await main(inputPath);
}

async function main(filePath) {
  try {
    const raw = await readFile(resolve(process.cwd(), filePath), "utf8");
    const input = JSON.parse(raw);
    const inputErrors = validateInput(input);
    const report = inputErrors.length > 0
      ? {
          status: "failed",
          reasons: inputErrors,
          result: {
            success: false,
            status: 400,
            error: "Invalid console test input",
            validationErrors: inputErrors,
          },
        }
      : await runConsoleTest(input);

    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.status === "passed" ? 0 : 1;
  } catch (error) {
    console.error(JSON.stringify({
      status: "failed",
      reasons: [error instanceof Error ? error.message : "Unknown console test error"],
    }, null, 2));
    process.exitCode = 1;
  }
}

function validateInput(input) {
  const reasons = [];

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

async function runConsoleTest(input) {
  const result = await invokeFetchClient(
    input.integration,
    input.path,
    input.params ?? {},
    input.credentialValue,
  );

  const reasons = [];
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
