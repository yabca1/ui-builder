import { describe, expect, it } from "vitest";
import { getValueByPath, setValueByPath } from "../path-utils";

describe("path utils", () => {
  it("sets and reads nested object values by dot path", () => {
    const target: Record<string, any> = {};

    setValueByPath(target, "user.firstName", "Abebe");
    setValueByPath(target, "user.address.city", "Addis Ababa");

    expect(target).toEqual({
      user: {
        firstName: "Abebe",
        address: {
          city: "Addis Ababa",
        },
      },
    });
    expect(getValueByPath(target, "user.address.city")).toBe("Addis Ababa");
  });

  it("supports numeric array segments", () => {
    const target: Record<string, any> = {};

    setValueByPath(target, "items.0.name", "First");

    expect(Array.isArray(target.items)).toBe(true);
    expect(getValueByPath(target, "items.0.name")).toBe("First");
  });
});
