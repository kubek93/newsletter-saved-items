import { describe, expect, it } from "vitest";
import { uploadFilename, uploadPathFor } from "./upload-item";

describe("upload paths", () => {
  it.each([
    ["a plain name", "IMG_0001.jpg", "IMG_0001.jpg"],
    ["a name with dashes", "my-photo-2.jpg", "my-photo-2.jpg"],
    ["spaces and odd characters", "zdjęcie z wakacji (1).jpg", "zdj_cie_z_wakacji_1_.jpg"],
    ["an empty name", "", "file"],
  ])("round-trips %s", (_name, filename, expected) => {
    const path = uploadPathFor(filename);
    expect(path).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}-/);
    expect(uploadFilename(path)).toBe(expected);
  });

  it("gives two uploads of one file different paths", () => {
    expect(uploadPathFor("a.jpg")).not.toBe(uploadPathFor("a.jpg"));
  });
});
