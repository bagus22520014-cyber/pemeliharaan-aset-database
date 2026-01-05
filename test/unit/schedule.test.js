import { expect } from "chai";
import { computeNext } from "../../src/utils/schedule.js";

describe("computeNext", () => {
  it("adds days correctly", () => {
    const r = computeNext("2025-12-01", 10, "day");
    expect(r).to.equal("2025-12-11");
  });
  it("adds weeks correctly", () => {
    const r = computeNext("2025-12-01", 2, "week");
    expect(r).to.equal("2025-12-15");
  });
  it("adds months correctly across year boundary", () => {
    const r = computeNext("2025-11-30", 2, "month");
    expect(r).to.equal("2026-01-30");
  });
  it("returns null for invalid unit", () => {
    const r = computeNext("2025-12-01", 1, "unknown");
    expect(r).to.equal(null);
  });
  it("returns null for invalid interval", () => {
    const r = computeNext("2025-12-01", 0, "day");
    expect(r).to.equal(null);
  });
});
