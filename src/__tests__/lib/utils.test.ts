import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("utils", () => {
  describe("cn (className merger)", () => {
    it("powinien łączyć klasy CSS", () => {
      const result = cn("class1", "class2");
      expect(result).toContain("class1");
      expect(result).toContain("class2");
    });

    it("powinien obsługiwać undefined i null", () => {
      const result = cn("class1", undefined, null, "class2");
      expect(result).toContain("class1");
      expect(result).toContain("class2");
    });

    it("powinien obsługiwać obiekty warunkowe", () => {
      const result = cn("base", {
        active: true,
        disabled: false,
      });
      expect(result).toContain("base");
      expect(result).toContain("active");
      expect(result).not.toContain("disabled");
    });
  });
});
