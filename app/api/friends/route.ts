import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SerializableUser = {
  phoneNumber: string;
  name: string | null;
};

type SerializableRequest = {
  id: string;
  createdAt: string;
  from?: SerializableUser;
  to?: SerializableUser;
};

function serializeUser(user: { phoneNumber: string; name: string | null }): SerializableUser {
  return {
    phoneNumber: user.phoneNumber,
    name: user.name ?? null,
  };
}

function createRequestPayload(
  request: {
    id: string;
    createdAt: Date;
    sender?: { phoneNumber: string; name: string | null };
    receiver?: { phoneNumber: string; name: string | null };
  },
  direction: "incoming" | "outgoing",
): SerializableRequest {
  return {
    id: request.id,
    createdAt: request.createdAt.toISOString(),
    ...(direction === "incoming"
      ? { from: request.sender ? serializeUser(request.sender) : undefined }
      : { to: request.receiver ? serializeUser(request.receiver) : undefined }),
  };
}

const sendRequestSchema = z.object({
  phoneNumber: z.string().min(1),
});

const respondSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["accept", "decline"]),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.phoneNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.phoneNumber;

  const user = await prisma.user.findUnique({
    where: { phoneNumber: currentUserId },
    include: {
      friends: { select: { phoneNumber: true, name: true } },
      friendOf: { select: { phoneNumber: true, name: true } },
      friendRequestsReceived: {
        where: { status: "PENDING" },
        include: { sender: { select: { phoneNumber: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      friendRequestsSent: {
        where: { status: "PENDING" },
        include: { receiver: { select: { phoneNumber: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const friendsMap = new Map<string, SerializableUser>();

  for (const friend of user.friends) {
    friendsMap.set(friend.phoneNumber, serializeUser(friend));
  }

  for (const friend of user.friendOf) {
    friendsMap.set(friend.phoneNumber, serializeUser(friend));
  }

  const friends = Array.from(friendsMap.values()).sort((a, b) => {
    const nameA = a.name ?? a.phoneNumber;
    const nameB = b.name ?? b.phoneNumber;
    return nameA.localeCompare(nameB);
  });

  const incomingRequests = user.friendRequestsReceived.map((request) =>
    createRequestPayload(request, "incoming"),
  );
  const outgoingRequests = user.friendRequestsSent.map((request) =>
    createRequestPayload(request, "outgoing"),
  );

  return NextResponse.json({ friends, incomingRequests, outgoingRequests });
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.phoneNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const currentUserId = session.user.phoneNumber;
  const targetPhoneNumber = parsed.data.phoneNumber;

  if (targetPhoneNumber === currentUserId) {
    return NextResponse.json({ error: "You cannot add yourself" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { phoneNumber: targetPhoneNumber },
    select: { phoneNumber: true, name: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const alreadyFriends = await prisma.user.findFirst({
    where: {
      phoneNumber: currentUserId,
      OR: [
        { friends: { some: { phoneNumber: targetPhoneNumber } } },
        { friendOf: { some: { phoneNumber: targetPhoneNumber } } },
      ],
    },
    select: { phoneNumber: true },
  });

  if (alreadyFriends) {
    return NextResponse.json({ error: "You are already friends" }, { status: 409 });
  }

  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        {
          senderId: currentUserId,
          receiverId: targetPhoneNumber,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
        {
          senderId: targetPhoneNumber,
          receiverId: currentUserId,
          status: "PENDING",
        },
      ],
    },
  });

  if (existingRequest) {
    if (existingRequest.senderId === targetPhoneNumber && existingRequest.status === "PENDING") {
      await prisma.friendRequest.update({
        where: { id: existingRequest.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });

      await prisma.user.update({
        where: { phoneNumber: currentUserId },
        data: { friends: { connect: { phoneNumber: targetPhoneNumber } } },
      });

      await prisma.user.update({
        where: { phoneNumber: targetPhoneNumber },
        data: { friends: { connect: { phoneNumber: currentUserId } } },
      });

      return NextResponse.json({
        status: "accepted",
        friend: serializeUser(targetUser),
        requestId: existingRequest.id,
      });
    }

    return NextResponse.json({ error: "Request already exists" }, { status: 409 });
  }

  const request = await prisma.friendRequest.create({
    data: {
      senderId: currentUserId,
      receiverId: targetPhoneNumber,
    },
    include: {
      receiver: { select: { phoneNumber: true, name: true } },
    },
  });

  return NextResponse.json({
    status: "pending",
    request: createRequestPayload(request, "outgoing"),
  });
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user?.phoneNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = respondSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const currentUserId = session.user.phoneNumber;

  const request = await prisma.friendRequest.findUnique({
    where: { id: parsed.data.requestId },
    include: {
      sender: { select: { phoneNumber: true, name: true } },
    },
  });

  if (!request || request.receiverId !== currentUserId) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Request already handled" }, { status: 409 });
  }

  if (parsed.data.action === "decline") {
    await prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });

    return NextResponse.json({ status: "declined" });
  }

  await prisma.friendRequest.update({
    where: { id: request.id },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });

  await prisma.user.update({
    where: { phoneNumber: currentUserId },
    data: { friends: { connect: { phoneNumber: request.senderId } } },
  });

  await prisma.user.update({
    where: { phoneNumber: request.senderId },
    data: { friends: { connect: { phoneNumber: currentUserId } } },
  });

  return NextResponse.json({ status: "accepted", friend: serializeUser(request.sender) });
}
