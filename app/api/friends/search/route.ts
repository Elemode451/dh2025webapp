import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function serializeUser(user: { phoneNumber: string; name: string | null }) {
  return {
    phoneNumber: user.phoneNumber,
    name: user.name ?? null,
  };
}

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.phoneNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const trimmed = query.trim();
  const currentUserId = session.user.phoneNumber;

  const relationships = await prisma.user.findUnique({
    where: { phoneNumber: currentUserId },
    include: {
      friends: { select: { phoneNumber: true } },
      friendOf: { select: { phoneNumber: true } },
      friendRequestsSent: {
        where: { status: "PENDING" },
        select: { receiverId: true },
      },
      friendRequestsReceived: {
        where: { status: "PENDING" },
        select: { senderId: true },
      },
    },
  });

  const excluded = new Set<string>([currentUserId]);

  if (relationships) {
    for (const friend of relationships.friends) {
      excluded.add(friend.phoneNumber);
    }
    for (const friend of relationships.friendOf) {
      excluded.add(friend.phoneNumber);
    }
    for (const pending of relationships.friendRequestsSent) {
      excluded.add(pending.receiverId);
    }
    for (const pending of relationships.friendRequestsReceived) {
      excluded.add(pending.senderId);
    }
  }

  const matchesByPhone = await prisma.user.findMany({
    where: {
      phoneNumber: { not: currentUserId, contains: trimmed, mode: "insensitive" },
    },
    select: { phoneNumber: true, name: true },
    take: 10,
  });

  const matchesByName = await prisma.user.findMany({
    where: {
      phoneNumber: { not: currentUserId },
      name: { contains: trimmed, mode: "insensitive" },
    },
    select: { phoneNumber: true, name: true },
    take: 10,
  });

  const combined = [...matchesByPhone, ...matchesByName];
  const uniqueMap = new Map<string, { phoneNumber: string; name: string | null }>();

  for (const user of combined) {
    if (excluded.has(user.phoneNumber)) {
      continue;
    }
    if (!uniqueMap.has(user.phoneNumber)) {
      uniqueMap.set(user.phoneNumber, user);
    }
  }

  const results = Array.from(uniqueMap.values())
    .map(serializeUser)
    .sort((a, b) => {
      const nameA = a.name ?? a.phoneNumber;
      const nameB = b.name ?? b.phoneNumber;
      return nameA.localeCompare(nameB);
    })
    .slice(0, 10);

  return NextResponse.json({ results });
}
