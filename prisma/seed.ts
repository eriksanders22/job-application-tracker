import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@example.com"
    }
  });

  await prisma.gmailConnection.upsert({
    where: { id: "demo-gmail-connection" },
    update: {},
    create: {
      id: "demo-gmail-connection",
      userId: user.id,
      googleEmail: "demo@gmail.com",
      accessTokenEncrypted: "placeholder-access-token",
      refreshTokenEncrypted: "placeholder-refresh-token",
      tokenExpiresAt: new Date("2026-12-31T23:59:59.000Z"),
      scopes: "openid email profile"
    }
  });

  const applicationSeeds = [
    {
      id: "app-northstar-labs",
      company: "Northstar Labs",
      role: "Frontend Engineer",
      status: "needs_action",
      lastEmailDate: new Date("2026-05-30T10:00:00.000Z"),
      confidenceScore: 0.92,
      gmailMessageId: "mock-message-northstar",
      threadId: "mock-thread-northstar",
      fromEmail: "recruiting@northstarlabs.example",
      subject: "Next step for your Frontend Engineer application",
      snippet:
        "Thanks for applying. We would like to schedule a technical screen this week. Please reply with your availability.",
      todo: "Reply with availability for a technical screen."
    },
    {
      id: "app-brightpath-health",
      company: "BrightPath Health",
      role: "Full Stack Developer",
      status: "waiting",
      lastEmailDate: new Date("2026-05-28T10:00:00.000Z"),
      confidenceScore: 0.82,
      gmailMessageId: "mock-message-brightpath",
      threadId: "mock-thread-brightpath",
      fromEmail: "jobs@brightpath.example",
      subject: "We received your application",
      snippet:
        "We received your application and our hiring team is reviewing your materials. We will share next steps soon.",
      todo: "Wait for recruiter response."
    },
    {
      id: "app-atlas-fintech",
      company: "Atlas Fintech",
      role: "React Engineer",
      status: "rejected",
      lastEmailDate: new Date("2026-05-25T10:00:00.000Z"),
      confidenceScore: 0.95,
      gmailMessageId: "mock-message-atlas",
      threadId: "mock-thread-atlas",
      fromEmail: "talent@atlasfintech.example",
      subject: "Update on your React Engineer application",
      snippet:
        "Unfortunately, we will not be moving forward with your application for this role at this time.",
      todo: "No follow-up needed."
    },
    {
      id: "app-evergreen-ai",
      company: "Evergreen AI",
      role: "Product Engineer",
      status: "needs_action",
      lastEmailDate: new Date("2026-05-22T10:00:00.000Z"),
      confidenceScore: 0.9,
      gmailMessageId: "mock-message-evergreen",
      threadId: "mock-thread-evergreen",
      fromEmail: "hiring@evergreenai.example",
      subject: "Take-home assignment",
      snippet:
        "Congratulations on moving to the next round. Please complete the take-home assignment by Friday.",
      todo: "Complete take-home assignment."
    },
    {
      id: "app-metrocloud",
      company: "MetroCloud",
      role: "Software Engineer",
      status: "waiting",
      lastEmailDate: new Date("2026-05-19T10:00:00.000Z"),
      confidenceScore: 0.78,
      gmailMessageId: "mock-message-metrocloud",
      threadId: "mock-thread-metrocloud",
      fromEmail: "recruiting@metrocloud.example",
      subject: "Interview feedback update",
      snippet:
        "Your interview feedback is still being reviewed. We expect to have an update for you next week.",
      todo: "Follow up if no update by next week."
    },
    {
      id: "app-civicstack",
      company: "CivicStack",
      role: "TypeScript Developer",
      status: "rejected",
      lastEmailDate: new Date("2026-05-16T10:00:00.000Z"),
      confidenceScore: 0.94,
      gmailMessageId: "mock-message-civicstack",
      threadId: "mock-thread-civicstack",
      fromEmail: "careers@civicstack.example",
      subject: "Application decision",
      snippet:
        "After careful consideration, we have decided to pursue other candidates for the TypeScript Developer role.",
      todo: "Archive application."
    }
  ];

  for (const seed of applicationSeeds) {
    const application = await prisma.jobApplication.upsert({
      where: { id: seed.id },
      update: {
        status: seed.status,
        lastEmailDate: seed.lastEmailDate,
        confidenceScore: seed.confidenceScore
      },
      create: {
        id: seed.id,
        userId: user.id,
        company: seed.company,
        role: seed.role,
        status: seed.status,
        lastEmailDate: seed.lastEmailDate,
        confidenceScore: seed.confidenceScore
      }
    });

    await prisma.jobEmail.upsert({
      where: { gmailMessageId: seed.gmailMessageId },
      update: {
        applicationId: application.id,
        classification: seed.status,
        snippet: seed.snippet,
        receivedAt: seed.lastEmailDate
      },
      create: {
        userId: user.id,
        applicationId: application.id,
        gmailMessageId: seed.gmailMessageId,
        threadId: seed.threadId,
        fromEmail: seed.fromEmail,
        subject: seed.subject,
        snippet: seed.snippet,
        receivedAt: seed.lastEmailDate,
        classification: seed.status
      }
    });

    await prisma.todo.upsert({
      where: { id: `todo-${seed.id}` },
      update: {
        task: seed.todo,
        completed: seed.status === "rejected"
      },
      create: {
        id: `todo-${seed.id}`,
        userId: user.id,
        applicationId: application.id,
        task: seed.todo,
        completed: seed.status === "rejected"
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
