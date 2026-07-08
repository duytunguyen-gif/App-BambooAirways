import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("turns a fault title into a kebab-case slug", () => {
    expect(slugify("AUTO FLT - RUDDER TRIM 1(2) FAULT")).toBe(
      "auto-flt-rudder-trim-1-2-fault"
    );
  });

  it("trims leading/trailing separators and collapses runs", () => {
    expect(slugify("  ***Hello___World!!  ")).toBe("hello-world");
  });

  it("returns empty string for non-alphanumeric input", () => {
    expect(slugify("()[]--")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when unused", () => {
    expect(uniqueSlug("FAC Fault", new Set())).toBe("fac-fault");
  });

  it("appends an incrementing suffix on collision", () => {
    const used = new Set(["fac-fault", "fac-fault-2"]);
    expect(uniqueSlug("FAC Fault", used)).toBe("fac-fault-3");
  });

  it("falls back to 'item' when the title has no usable characters", () => {
    expect(uniqueSlug("///", new Set())).toBe("item");
  });
});
