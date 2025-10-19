import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';

import { SocialView } from './_components/social-view';

export type FriendSummary = {
  phoneNumber: string;
  name: string | null;
};

export type IncomingRequestSummary = {
  id: string;
  createdAt: string;
  from: FriendSummary;
};

export type OutgoingRequestSummary = {
  id: string;
  createdAt: string;
  to: FriendSummary;
};

export type SocialData = {
  friends: FriendSummary[];
  incomingRequests: IncomingRequestSummary[];
  outgoingRequests: OutgoingRequestSummary[];
};

function serializeUser(user: { phoneNumber: string; name: string | null }): FriendSummary {
  return {
    phoneNumber: user.phoneNumber,
    name: user.name ?? null,
  };
}

export default async function SocialPage() {
  const session = await auth();

  if (!session?.user?.phoneNumber) {
    redirect('/login');
  }

  const userId = session.user.phoneNumber;

  const user = await prisma.user.findUnique({
    where: { phoneNumber: userId },
    include: {
      friends: { select: { phoneNumber: true, name: true } },
      friendOf: { select: { phoneNumber: true, name: true } },
      friendRequestsReceived: {
        where: { status: 'PENDING' },
        include: { sender: { select: { phoneNumber: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      friendRequestsSent: {
        where: { status: 'PENDING' },
        include: { receiver: { select: { phoneNumber: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  const friendsMap = new Map<string, FriendSummary>();

  for (const friend of user.friends) {
    friendsMap.set(friend.phoneNumber, serializeUser(friend));
  }

  for (const friend of user.friendOf) {
    friendsMap.set(friend.phoneNumber, serializeUser(friend));
  }

  const data: SocialData = {
    friends: Array.from(friendsMap.values()).sort((a, b) => {
      const nameA = a.name ?? a.phoneNumber;
      const nameB = b.name ?? b.phoneNumber;
      return nameA.localeCompare(nameB);
    }),
    incomingRequests: user.friendRequestsReceived.map((request) => ({
      id: request.id,
      createdAt: request.createdAt.toISOString(),
      from: serializeUser(request.sender),
    })),
    outgoingRequests: user.friendRequestsSent.map((request) => ({
      id: request.id,
      createdAt: request.createdAt.toISOString(),
      to: serializeUser(request.receiver),
    })),
  };

  return <SocialView initialData={data} />;
}
