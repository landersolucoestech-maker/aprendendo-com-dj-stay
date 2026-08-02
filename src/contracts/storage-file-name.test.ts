import { describe, expect, it } from "vitest";

import { avatarFileSchema } from "@/contracts/storage";

describe("avatarFileSchema control characters", () => {
  it("rejeita quebra de linha no nome do arquivo", () => {
    const file = new File([new Uint8Array([1])], "avatar\n.png", {
      type: "image/png",
    });

    expect(avatarFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejeita DEL no nome do arquivo", () => {
    const file = new File([new Uint8Array([1])], "avatar\u007f.png", {
      type: "image/png",
    });

    expect(avatarFileSchema.safeParse(file).success).toBe(false);
  });
});
