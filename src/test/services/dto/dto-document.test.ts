import { describe, expect, it, vi } from "vitest";
import { documentSerializer } from "../../../services/dto/dto-document";

vi.mock("../../../server/utils", () => ({
  getDocumentUrl: vi.fn((key: string) => `https://cdn.example.com/${key}`),
}));

describe("documentSerializer", () => {
  it("maps all document fields and builds the URL from s3Key", () => {
    const doc = {
      id: 3,
      type: "cgc",
      originalName: "certificate.pdf",
      s3Key: "docs/user-1/certificate.pdf",
      mimeType: "application/pdf",
      createdAt: new Date("2025-01-15"),
    };

    const result = documentSerializer(doc as any);

    expect(result).toEqual({
      id: 3,
      type: "cgc",
      originalName: "certificate.pdf",
      url: "https://cdn.example.com/docs/user-1/certificate.pdf",
      mimeType: "application/pdf",
      createdAt: doc.createdAt,
    });
  });

  it("calls getDocumentUrl with the s3Key", async () => {
    const { getDocumentUrl } = await import("../../../server/utils");
    const doc = {
      id: 4,
      type: "passport",
      originalName: "id.jpg",
      s3Key: "docs/user-2/id.jpg",
      mimeType: "image/jpeg",
      createdAt: new Date(),
    };

    documentSerializer(doc as any);
    expect(getDocumentUrl).toHaveBeenCalledWith("docs/user-2/id.jpg");
  });
});
