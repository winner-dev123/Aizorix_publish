/**
 * Integration tests for the Phase 6.5 AI-demo actions.
 *
 *   - runDemoTurnAction:           auth gate, validation, persists into a
 *                                  WEB-channel Conversation, returns the
 *                                  envelope from a scripted LLM
 *   - clearDemoConversationAction: auth gate, deletes the demo conv + msgs
 *
 * The orchestrator's LLM is dependency-injected at the orchestrate() call
 * site, so we can't intercept it from the action — instead, we exercise
 * the action end-to-end and let orchestrate() handle the LLM call. To
 * keep the test deterministic and free, we mock the OpenAI module at the
 * import boundary.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(), signIn: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Intercept the OpenAI adapter so orchestrate() doesn't try to hit the
// real API. We return a single-turn scripted assistant response.
vi.mock("../../ai/openai", () => ({
  getLLMClient: () => ({
    async chat() {
      return {
        text: "Hola, soy el bot. ¿En qué te ayudo?",
        stopReason: "stop",
        toolCalls: [],
      };
    },
  }),
}));

import { prisma } from "../../db";
import { clearDemoConversationAction, runDemoTurnAction } from "../ai-demo";
import { auth } from "@/auth";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

function mockSession(clinicId: string, userId: string) {
  vi.mocked(auth).mockResolvedValue({
    user: { id: userId, clinicId, role: "OWNER", email: "demo@test.demo" },
    expires: "2999-01-01T00:00:00.000Z",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describeMaybe("ai-demo server actions (DB)", () => {
  let clinicId: string;
  const demoUserId = "demo-test-user";

  beforeAll(async () => {
    // Reuse the seeded Bellem clinic — the demo creates a WEB-channel
    // conversation that's invisible to other test files' WhatsApp queries.
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { slug: "bellem" } });
    clinicId = clinic.id;

    // Clean any leftover demo conversation from a previous failed run.
    await prisma.message.deleteMany({
      where: { conversation: { externalChatId: `demo-${demoUserId}` } },
    });
    await prisma.conversation.deleteMany({
      where: { clinicId, externalChatId: `demo-${demoUserId}` },
    });
  });

  afterAll(async () => {
    await prisma.message.deleteMany({
      where: { conversation: { externalChatId: `demo-${demoUserId}` } },
    });
    await prisma.conversation.deleteMany({
      where: { clinicId, externalChatId: `demo-${demoUserId}` },
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  describe("runDemoTurnAction", () => {
    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await runDemoTurnAction({ message: "Hola" });
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("returns VALIDATION_ERROR on empty message", async () => {
      mockSession(clinicId, demoUserId);
      const res = await runDemoTurnAction({ message: "   " });
      expect(res.ok === false && res.error.code).toBe("VALIDATION_ERROR");
    });

    it("happy path: orchestrates a turn on a WEB-channel demo conversation", async () => {
      mockSession(clinicId, demoUserId);
      const res = await runDemoTurnAction({ message: "Hola, soy una prueba." });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.respuesta).toContain("bot");

      // Conversation persisted on the WEB channel with the expected prefix.
      const conv = await prisma.conversation.findFirst({
        where: { clinicId, externalChatId: `demo-${demoUserId}` },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      expect(conv).not.toBeNull();
      expect(conv!.channel).toBe("WEB");
      expect(conv!.messages.length).toBeGreaterThanOrEqual(2); // USER + ASSISTANT
      expect(conv!.messages.find((m) => m.role === "USER")?.content).toBe(
        "Hola, soy una prueba.",
      );
    });
  });

  describe("clearDemoConversationAction", () => {
    it("returns UNAUTHORIZED when no session", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(auth).mockResolvedValue(null as any);
      const res = await clearDemoConversationAction();
      expect(res.ok === false && res.error.code).toBe("UNAUTHORIZED");
    });

    it("deletes the demo conversation and its messages", async () => {
      mockSession(clinicId, demoUserId);
      // Make sure there's something to delete: run one turn first.
      await runDemoTurnAction({ message: "Hola otra vez." });
      const before = await prisma.conversation.findFirst({
        where: { clinicId, externalChatId: `demo-${demoUserId}` },
      });
      expect(before).not.toBeNull();

      const res = await clearDemoConversationAction();
      expect(res.ok).toBe(true);

      const after = await prisma.conversation.findFirst({
        where: { clinicId, externalChatId: `demo-${demoUserId}` },
      });
      expect(after).toBeNull();
    });

    it("is idempotent — succeeds when there's nothing to clear", async () => {
      mockSession(clinicId, demoUserId);
      const res = await clearDemoConversationAction();
      expect(res.ok).toBe(true);
    });
  });
});
