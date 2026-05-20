import { prisma } from "../src/server/db";

async function main() {
  const phone = process.argv[2];
  if (!phone) throw new Error("Usage: tsx scripts/last-tools.ts <phoneE164>");

  const conv = await prisma.conversation.findFirst({
    where: { externalChatId: phone },
    orderBy: { lastMessageAt: "desc" },
  });
  if (!conv) {
    console.log(`No conversation for ${phone}`);
    return;
  }

  const message = await prisma.message.findFirst({
    where: { conversationId: conv.id, role: "ASSISTANT" },
    orderBy: { createdAt: "desc" },
  });
  if (!message) {
    console.log(`No assistant message yet in conversation ${conv.id}`);
    return;
  }

  console.log(`Conversation: ${conv.id}`);
  console.log(`Assistant said: ${message.content}\n`);
  console.log("Tool trace:");
  console.log(JSON.stringify(message.metadata, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
