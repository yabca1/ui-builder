import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../route";

describe("Proxy route POST handler", () => {
  const mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns 400 if url is missing", async () => {
    const request = new Request("http://localhost/api/proxy", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing target URL");
  });

  it("forwards method, headers, body, and resolves JSON responses", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "content-type": "application/json", "X-Server-Header": "TestValue" }),
      json: async () => ({ ok: true }),
    });

    const request = new Request("http://localhost/api/proxy", {
      method: "POST",
      body: JSON.stringify({
        url: "https://external.api/data",
        method: "POST",
        headers: { "Authorization": "Bearer token" },
        body: { id: 123 },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe(200);
    expect(body.headers).toHaveProperty("x-server-header", "TestValue");
    expect(body.data).toEqual({ ok: true });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://external.api/data",
      expect.objectContaining({
        method: "POST",
        headers: { "Authorization": "Bearer token" },
        body: JSON.stringify({ id: 123 }),
      })
    );
  });
});
