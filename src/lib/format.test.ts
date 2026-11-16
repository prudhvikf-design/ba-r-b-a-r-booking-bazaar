import { describe, expect, it } from "vitest";
import { addDaysToDateString, formatINR, rupeesToPaise, sanitizeSearch, weekdayOfDateString } from "./format";

describe("money is handled as integer paise", () => {
  it("converts rupee input to paise without float errors", () => {
    expect(rupeesToPaise("499")).toBe(49900);
    expect(rupeesToPaise("499.5")).toBe(49950);
    expect(rupeesToPaise("0.29")).toBe(29);
    expect(rupeesToPaise("₹1,250")).toBe(125000);
  });

  it("rejects invalid or negative amounts", () => {
    expect(rupeesToPaise("-10")).toBeNull();
    expect(rupeesToPaise("12.345")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNull();
  });

  it("formats paise as Indian rupees", () => {
    expect(formatINR(49900)).toBe("₹499");
    expect(formatINR(12345600)).toBe("₹1,23,456");
  });
});

describe("date helpers", () => {
  it("adds days across month ends", () => {
    expect(addDaysToDateString("2026-01-31", 1)).toBe("2026-02-01");
  });
  it("returns Sunday as weekday 0", () => {
    expect(weekdayOfDateString("2026-11-15")).toBe(0);
  });
});

describe("search sanitising", () => {
  it("removes filter-breaking characters", () => {
    expect(sanitizeSearch("fade,(cut)%")).toBe("fade cut");
  });
});
