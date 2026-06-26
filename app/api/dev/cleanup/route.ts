import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [deletedTodos, deletedEmails, deletedApplications] =
    await prisma.$transaction([
      prisma.todo.deleteMany({ where: { userId: user.id } }),
      prisma.jobEmail.deleteMany({ where: { userId: user.id } }),
      prisma.jobApplication.deleteMany({ where: { userId: user.id } })
    ]);

  return NextResponse.json({
    deletedApplications: deletedApplications.count,
    deletedEmails: deletedEmails.count,
    deletedTodos: deletedTodos.count
  });
}
