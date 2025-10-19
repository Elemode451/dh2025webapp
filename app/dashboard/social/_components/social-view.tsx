"use client";

import { useCallback, useMemo, useState } from 'react';

import type { Plant } from '../../_components/plant-gallery';
import { PlantModal } from '../../_components/plant-modal';
import type { FriendSummary, OutgoingRequestSummary, SocialData } from '../page';
import { AddFriendModal } from './add-friend-modal';
import { FriendPlantsModal } from './friend-plants-modal';

type RequestResult =
  | { type: 'pending'; request: OutgoingRequestSummary }
  | { type: 'accepted'; friend: FriendSummary; requestId?: string | null };

type SocialViewProps = {
  initialData: SocialData;
};

function sortFriends(friends: FriendSummary[]) {
  return [...friends].sort((a, b) => {
    const nameA = a.name ?? a.phoneNumber;
    const nameB = b.name ?? b.phoneNumber;
    return nameA.localeCompare(nameB);
  });
}

export function SocialView({ initialData }: SocialViewProps) {
  const [friends, setFriends] = useState(initialData.friends);
  const [incomingRequests, setIncomingRequests] = useState(initialData.incomingRequests);
  const [outgoingRequests, setOutgoingRequests] = useState(initialData.outgoingRequests);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeFriend, setActiveFriend] = useState<FriendSummary | null>(null);
  const [friendPlants, setFriendPlants] = useState<Plant[]>([]);
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [plantsError, setPlantsError] = useState<string | null>(null);
  const [isLoadingPlants, setIsLoadingPlants] = useState(false);
  const [activePlant, setActivePlant] = useState<Plant | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const existingFriendIds = useMemo(() => friends.map((friend) => friend.phoneNumber), [friends]);

  const handleFriendClick = useCallback(async (friend: FriendSummary) => {
    setActiveFriend(friend);
    setIsFriendModalOpen(true);
    setPlantsError(null);
    setFriendPlants([]);
    setIsLoadingPlants(true);

    try {
      const response = await fetch(`/api/friends/${encodeURIComponent(friend.phoneNumber)}/plants`);

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Unable to load plants.');
      }

      const data = (await response.json()) as { plants?: Plant[] };
      setFriendPlants(Array.isArray(data.plants) ? data.plants : []);
    } catch (error) {
      console.error(error);
      setPlantsError('We could not load this friend\'s plants right now.');
    } finally {
      setIsLoadingPlants(false);
    }
  }, []);

  const closeFriendModal = useCallback(() => {
    setIsFriendModalOpen(false);
    setActiveFriend(null);
    setFriendPlants([]);
    setPlantsError(null);
  }, []);

  const handleIncomingAction = useCallback(
    async (requestId: string, action: 'accept' | 'decline') => {
      setProcessingRequestId(requestId);

      try {
        const response = await fetch('/api/friends', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, action }),
        });

        const data = (await response.json().catch(() => null)) as
          | { status?: string; friend?: FriendSummary; error?: string }
          | null;

        if (!response.ok || !data) {
          throw new Error(data?.error ?? 'Unable to update request.');
        }

        setIncomingRequests((current) => current.filter((request) => request.id !== requestId));

        if (data.status === 'accepted' && data.friend) {
          const acceptedFriend = data.friend;
          setFriends((current) => {
            const next = current.filter((friend) => friend.phoneNumber !== acceptedFriend.phoneNumber);
            next.push(acceptedFriend);
            return sortFriends(next);
          });
        }
      } catch (error) {
        console.error(error);
        window.alert('Something went wrong. Please try again.');
      } finally {
        setProcessingRequestId(null);
      }
    },
    [],
  );

  const handleRequestResult = useCallback(
    (result: RequestResult) => {
      if (result.type === 'pending') {
        setOutgoingRequests((current) => [result.request, ...current]);
        return;
      }

      setFriends((current) => {
        const exists = current.some((friend) => friend.phoneNumber === result.friend.phoneNumber);
        if (exists) {
          return current;
        }
        const next = [...current, result.friend];
        return sortFriends(next);
      });

      if (result.requestId) {
        setIncomingRequests((current) =>
          current.filter((request) => request.id !== result.requestId),
        );
      }
    },
    [],
  );

  const handlePlantClick = useCallback((plant: Plant) => {
    setActivePlant(plant);
  }, []);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--ink)]">Social garden</h1>
            <p className="text-sm text-[var(--muted)]">
              Add friends to explore their collections and chat with their plants.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-emerald-500"
          >
            ➕ Add friend
          </button>
        </header>

        {friends.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {friends.map((friend) => (
              <button
                key={friend.phoneNumber}
                type="button"
                onClick={() => handleFriendClick(friend)}
                className="flex h-full flex-col items-start gap-3 rounded-[var(--card-radius)] border border-[var(--border)] bg-white/80 p-5 text-left shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[var(--shadow-card-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15 text-lg">
                  🌿
                </span>
                <div>
                  <p className="text-base font-semibold text-[var(--ink)]">
                    {friend.name ?? 'Unnamed friend'}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{friend.phoneNumber}</p>
                </div>
                <span className="mt-auto text-xs font-medium text-[var(--accent)]">View plants →</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--card-radius)] border border-dashed border-[var(--border)] bg-white/60 p-6 text-center text-sm text-[var(--muted)]">
            You have no friends yet. Start by sending a request!
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Friend requests</h2>
        {incomingRequests.length > 0 ? (
          <div className="space-y-3">
            {incomingRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--card-radius)] border border-[var(--border)] bg-white/80 p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {request.from.name ?? request.from.phoneNumber}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{request.from.phoneNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleIncomingAction(request.id, 'decline')}
                    disabled={processingRequestId === request.id}
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)] transition-colors duration-200 hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIncomingAction(request.id, 'accept')}
                    disabled={processingRequestId === request.id}
                    className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No incoming requests at the moment.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Pending invites</h2>
        {outgoingRequests.length > 0 ? (
          <ul className="space-y-2 text-sm text-[var(--muted)]">
            {outgoingRequests.map((request) => (
              <li key={request.id} className="flex items-center justify-between rounded-[var(--card-radius)] bg-white/60 px-4 py-3 shadow-inner">
                <span>{request.to.name ?? request.to.phoneNumber}</span>
                <span className="text-xs">Waiting...</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">No pending invites. Send one above!</p>
        )}
      </section>

      {isAddModalOpen ? (
        <AddFriendModal
          onClose={() => setIsAddModalOpen(false)}
          onRequestResult={handleRequestResult}
          existingFriendIds={existingFriendIds}
          incomingRequests={incomingRequests}
          outgoingRequests={outgoingRequests}
        />
      ) : null}

      {isFriendModalOpen && activeFriend ? (
        <FriendPlantsModal
          friend={activeFriend}
          plants={friendPlants}
          isLoading={isLoadingPlants}
          error={plantsError}
          onClose={closeFriendModal}
          onPlantClick={handlePlantClick}
        />
      ) : null}

      {activePlant ? <PlantModal plant={activePlant} onClose={() => setActivePlant(null)} /> : null}
    </div>
  );
}
