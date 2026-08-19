import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { invokeFetchClient, validatePayload, castPayload } from "../fetch-client";
import type { Integration, ApiPath } from "@/mini-app/types/mini-app.types";

describe("Fetch Client core runner", () => {
  const sampleIntegration: Integration = {
    id: "int-test",
    name: "Test API Service",
    baseUrl: "https://api.testservice.local",
    authConfig: {
      type: "none",
    },
    defaultHeaders: [
      { key: "X-Default-Header", value: "DefaultVal" }
    ],
    loggingLevel: "verbose",
  };

  const samplePathDef: ApiPath = {
    id: "path-test",
    name: "Get User Info",
    integrationId: "int-test",
    path: "/users/:userId/details",
    method: "GET",
    requestSchema: [
      { name: "userId", type: "number", required: true },
      { name: "sendEmail", type: "boolean", required: false, defaultValue: "false" },
      { name: "apiKey", type: "string", required: false }
    ],
    responseSchema: [
      { name: "profile.email", type: "string", required: true },
      { name: "profile.age", type: "number", required: false }
    ]
  };

  // Mock global fetch
  const mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    // Reset window detection mock
    vi.stubGlobal("window", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("casts payload fields to expected schema types", () => {
    const raw = { userId: "123", sendEmail: "true" };
    const casted = castPayload(raw, samplePathDef.requestSchema);

    expect(casted.userId).toBe(123);
    expect(casted.sendEmail).toBe(true);
  });

  it("constructs a nested POST request payload for registration mappings", async () => {
    const registerPath: ApiPath = {
      id: "register-user",
      name: "Register User",
      integrationId: "int-test",
      path: "/users/register",
      method: "POST",
      requestSchema: [
        { name: "user.firstName", type: "string", required: true },
        { name: "user.lastName", type: "string", required: true },
        { name: "user.phone", type: "string", required: true },
        { name: "user.address.city", type: "string", required: true },
        { name: "user.address.country", type: "string", required: true },
      ],
      responseSchema: [{ name: "data.user.id", type: "string", required: true }],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ data: { user: { id: "user-1" } } }),
    });

    const result = await invokeFetchClient(sampleIntegration, registerPath, {
      user: {
        firstName: "Abebe",
        lastName: "Kebede",
        phone: "0912345678",
        address: {
          city: "Addis Ababa",
          country: "Ethiopia",
        },
      },
    });

    expect(result.success).toBe(true);
    const fetchOptions = mockFetch.mock.calls[0][1];
    expect(JSON.parse(String(fetchOptions.body))).toEqual({
      user: {
        firstName: "Abebe",
        lastName: "Kebede",
        phone: "0912345678",
        address: {
          city: "Addis Ababa",
          country: "Ethiopia",
        },
      },
    });
  });

  it("constructs nested POST payloads from flat dotted console values", async () => {
    const createUserPath: ApiPath = {
      id: "create-user",
      name: "Create User",
      integrationId: "int-test",
      path: "/users",
      method: "POST",
      requestSchema: [
        { name: "name", type: "string", required: true },
        { name: "username", type: "string", required: true },
        { name: "email", type: "string", required: true },
        { name: "user.address.city", type: "string", required: true },
        { name: "metadata", type: "object", required: false },
        { name: "tags", type: "array", required: false },
        { name: "nickname", type: "string", required: false },
      ],
      responseSchema: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ id: 1 }),
    });

    const result = await invokeFetchClient(sampleIntegration, createUserPath, {
      name: "Yabets",
      username: "yabets",
      email: "yabets@example.com",
      "user.address.city": "Addis Ababa",
      metadata: "{\"source\":\"console\"}",
      tags: "[\"builder\",\"api\"]",
      nickname: "",
    });

    expect(result.success).toBe(true);
    const fetchOptions = mockFetch.mock.calls[0][1];
    expect(JSON.parse(String(fetchOptions.body))).toEqual({
      name: "Yabets",
      username: "yabets",
      email: "yabets@example.com",
      user: {
        address: {
          city: "Addis Ababa",
        },
      },
      metadata: {
        source: "console",
      },
      tags: ["builder", "api"],
    });
  });

  it("validates required payload constraints", () => {
    const invalid = { sendEmail: "true" }; // missing required userId
    const errors = validatePayload(invalid, samplePathDef.requestSchema);

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("required");
  });

  it("substitutes URL path parameters correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ profile: { email: "user@test.com" } }),
    });

    const result = await invokeFetchClient(sampleIntegration, samplePathDef, { userId: "555" });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.testservice.local/users/555/details?sendEmail=false",
      expect.any(Object)
    );
  });

  it("injects Bearer authentication header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ profile: { email: "user@test.com" } }),
    });

    const bearerIntegration: Integration = {
      ...sampleIntegration,
      authConfig: {
        type: "bearer",
        credentialId: "cred-bearer",
      }
    };

    const result = await invokeFetchClient(bearerIntegration, samplePathDef, { userId: "100" }, "my-secret-token");

    expect(result.success).toBe(true);
    const lastCallArgs = mockFetch.mock.calls[0];
    expect(lastCallArgs[1].headers).toHaveProperty("Authorization", "Bearer my-secret-token");
  });

  it("injects API Key custom auth headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ profile: { email: "user@test.com" } }),
    });

    const apiKeyIntegration: Integration = {
      ...sampleIntegration,
      authConfig: {
        type: "apiKey",
        headerName: "X-TEST-APIKEY",
        credentialId: "cred-key",
      }
    };

    const result = await invokeFetchClient(apiKeyIntegration, samplePathDef, { userId: "100" }, "secret-api-key-val");

    expect(result.success).toBe(true);
    const lastCallArgs = mockFetch.mock.calls[0];
    expect(lastCallArgs[1].headers).toHaveProperty("X-TEST-APIKEY", "secret-api-key-val");
  });

  it("intercepts placeholder key and returns dynamic mock exchange rates in-memory", async () => {
    const mockApiKeyPath: ApiPath = {
      ...samplePathDef,
      path: "/v6/:apiKey/latest/:baseCurrency",
      requestSchema: [
        { name: "apiKey", type: "string", required: true },
        { name: "baseCurrency", type: "string", required: true }
      ],
      responseSchema: [
        { name: "conversion_rates.EUR", type: "number", required: true }
      ]
    };

    const result = await invokeFetchClient(
      sampleIntegration,
      mockApiKeyPath,
      { apiKey: "YOUR_API_KEY_HERE", baseCurrency: "USD" }
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("result", "success");
    expect(result.data.conversion_rates).toHaveProperty("EUR", 0.92);
    // Fetch should not have been called due to simulation interceptor
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("routes requests through local /api/proxy in browser window sessions", async () => {
    // Stub browser window object
    vi.stubGlobal("window", {});
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 200,
        headers: { "content-type": "application/json" },
        data: { profile: { email: "user@test.com" } }
      }),
    });

    const result = await invokeFetchClient(sampleIntegration, samplePathDef, { userId: "777" });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/proxy",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          url: "https://api.testservice.local/users/777/details?sendEmail=false",
          method: "GET",
          headers: { "X-Default-Header": "DefaultVal" }
        })
      })
    );
  });

  it("asserts nested dot-notation response schema keys presence", async () => {
    // Return payload missing the required nested field profile.email
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ profile: { age: 25 } }), // missing email
    });

    const result = await invokeFetchClient(sampleIntegration, samplePathDef, { userId: "333" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Response validation failed");
    expect(result.validationErrors?.length).toBe(1);
    expect(result.validationErrors![0]).toContain("profile.email");
  });
});
