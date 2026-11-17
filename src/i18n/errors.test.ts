import { describe, expect, it } from "vitest";
import { localizeError } from "./errors";

describe("server messages on a Croatian screen", () => {
  it("translates known sentences and patterns, and leaves English alone", () => {
    expect(localizeError("hr", "Give your home a name.")).toBe("Daj svom domu ime.");
    expect(localizeError("hr", "Keep the name under 60 characters.")).toBe("Neka ime bude kraće od 60 znakova.");
    expect(localizeError("en", "Give your home a name.")).toBe("Give your home a name.");
  });
});
