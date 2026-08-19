import { beforeEach, describe, expect, it, vi } from "vitest";
import { runApiConsoleTest } from "../api-test-runner";
import type { ApiPath, Integration } from "@/mini-app/types/mini-app.types";

describe("API console test runner", () => {
  const mockFetch = vi.fn();

  const integration: Integration = {
    id: "currency",
    name: "Currency API",
    baseUrl: "https://api.currency.local",
    authConfig: { type: "none" },
    loggingLevel: "basic",
  };

  const path: ApiPath = {
    id: "latest-rates",
    name: "Latest Rates",
    integrationId: "currency",
    path: "/latest/:base",
    method: "GET",
    requestSchema: [{ name: "base", type: "string", required: true }],
    responseSchema: [{ name: "conversion_rates.USD", type: "number", required: true }],
  };

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("window", undefined);
  });

  it("returns passed with specific reasons when the API call and response schema pass", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ conversion_rates: { USD: 1 } }),
    });

    const report = await runApiConsoleTest({
      integration,
      path,
      params: { base: "EUR" },
    });

    expect(report.status).toBe("passed");
    expect(report.reasons).toContain("Request completed successfully with HTTP status 200.");
    expect(report.reasons).toContain("Response matched 1 declared response schema field(s).");
  });

  it("returns failed with validation reasons when required params are missing", async () => {
    const report = await runApiConsoleTest({
      integration,
      path,
      params: {},
    });

    expect(report.status).toBe("failed");
    expect(report.reasons.join(" ")).toContain('Field "base" is required.');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
