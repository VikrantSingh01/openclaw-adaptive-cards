import { describe, expect, it } from "vitest";
import {
  AC_VERSION,
  CARD_CLOSE_TAG,
  CARD_OPEN_TAG,
  DATA_CLOSE_TAG,
  DATA_OPEN_TAG,
  DEFAULT_FALLBACK,
} from "./constants.js";

describe("constants", () => {
  it("marker tags are valid HTML comments", () => {
    expect(CARD_OPEN_TAG).toMatch(/^<!--.+-->$/);
    expect(CARD_CLOSE_TAG).toMatch(/^<!--\/.+-->$/);
    expect(DATA_OPEN_TAG).toMatch(/^<!--.+-->$/);
    expect(DATA_CLOSE_TAG).toMatch(/^<!--\/.+-->$/);
  });

  it("open and close tags form matching pairs", () => {
    const cardId = CARD_OPEN_TAG.replace("<!--", "").replace("-->", "");
    const cardCloseId = CARD_CLOSE_TAG.replace("<!--/", "").replace("-->", "");
    expect(cardId).toBe(cardCloseId);

    const dataId = DATA_OPEN_TAG.replace("<!--", "").replace("-->", "");
    const dataCloseId = DATA_CLOSE_TAG.replace("<!--/", "").replace("-->", "");
    expect(dataId).toBe(dataCloseId);
  });

  it("AC_VERSION is a valid semver-like version", () => {
    expect(AC_VERSION).toMatch(/^\d+\.\d+$/);
  });

  it("AC_VERSION is 1.6", () => {
    expect(AC_VERSION).toBe("1.6");
  });

  it("DEFAULT_FALLBACK is a non-empty string", () => {
    expect(DEFAULT_FALLBACK.length).toBeGreaterThan(0);
  });
});
