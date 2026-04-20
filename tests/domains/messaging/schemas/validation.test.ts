import { describe, it, expect } from "vitest";
import {
  sendMessageSchema,
  createConversationSchema,
} from "@/domains/messaging/schemas/validation";

describe("sendMessageSchema", () => {
  it("accepts valid message with content", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "conv-123",
      content: "Czesc!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts message with images", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "conv-123",
      content: "Zdjecia produktu",
      images: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "conv-123",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing conversationId", () => {
    const result = sendMessageSchema.safeParse({
      content: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 images", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "conv-123",
      content: "Duzo zdjec",
      images: [
        "https://example.com/1.jpg",
        "https://example.com/2.jpg",
        "https://example.com/3.jpg",
        "https://example.com/4.jpg",
        "https://example.com/5.jpg",
        "https://example.com/6.jpg",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects content over 5000 characters", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "conv-123",
      content: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe("createConversationSchema", () => {
  it("accepts valid direct conversation", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: ["user-1"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid group conversation with name", () => {
    const result = createConversationSchema.safeParse({
      type: "GROUP",
      name: "Zakupy grupowe",
      participantIds: ["user-1", "user-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects direct conversation with no participants", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects direct conversation with more than 1 participant", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: ["user-1", "user-2"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects group conversation with fewer than 2 participants", () => {
    const result = createConversationSchema.safeParse({
      type: "GROUP",
      name: "Grupa",
      participantIds: ["user-1"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createConversationSchema.safeParse({
      type: "INVALID",
      participantIds: ["user-1"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts direct conversation with orderId", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: ["user-1"],
      orderId: "order-abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderId).toBe("order-abc");
    }
  });

  it("accepts direct conversation with listingId", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: ["user-1"],
      listingId: "listing-abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.listingId).toBe("listing-abc");
    }
  });

  it("rejects empty string orderId", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: ["user-1"],
      orderId: "",
    });
    expect(result.success).toBe(false);
  });
});
