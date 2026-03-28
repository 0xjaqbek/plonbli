import { describe, it, expect } from "vitest";
import {
  createPostSchema,
  addCommentSchema,
  createGroupSchema,
} from "@/domains/social/schemas/validation";

describe("createPostSchema", () => {
  it("accepts valid public post", () => {
    const result = createPostSchema.safeParse({
      content: "Swiezy zbiory pomidorow!",
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(true);
  });

  it("accepts post with images", () => {
    const result = createPostSchema.safeParse({
      content: "Zdjecia z pola",
      images: ["https://example.com/1.jpg"],
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(true);
  });

  it("accepts group post", () => {
    const result = createPostSchema.safeParse({
      content: "Post w grupie",
      groupId: "group-1",
      visibility: "GROUP",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = createPostSchema.safeParse({
      content: "",
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 images", () => {
    const result = createPostSchema.safeParse({
      content: "Za duzo zdjec",
      images: Array.from({ length: 11 }, (_, i) => `https://example.com/${i}.jpg`),
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content over 5000 characters", () => {
    const result = createPostSchema.safeParse({
      content: "a".repeat(5001),
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(false);
  });
});

describe("addCommentSchema", () => {
  it("accepts valid comment", () => {
    const result = addCommentSchema.safeParse({
      postId: "post-1",
      content: "Swietny post!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = addCommentSchema.safeParse({
      postId: "post-1",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing postId", () => {
    const result = addCommentSchema.safeParse({
      content: "Komentarz",
    });
    expect(result.success).toBe(false);
  });
});

describe("createGroupSchema", () => {
  it("accepts valid group", () => {
    const result = createGroupSchema.safeParse({
      name: "Grupa zakupowa Krakow",
      type: "BUYING_GROUP",
      joinPolicy: "OPEN",
    });
    expect(result.success).toBe(true);
  });

  it("accepts group with description", () => {
    const result = createGroupSchema.safeParse({
      name: "Spolecznosc EKO",
      description: "Grupa dla milosnikow ekologicznych produktow",
      type: "COMMUNITY",
      joinPolicy: "INVITE_ONLY",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createGroupSchema.safeParse({
      name: "",
      type: "COMMUNITY",
      joinPolicy: "OPEN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createGroupSchema.safeParse({
      name: "Grupa",
      type: "INVALID",
      joinPolicy: "OPEN",
    });
    expect(result.success).toBe(false);
  });
});
