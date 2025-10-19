"use client";

import { FormEvent, useMemo, useState } from 'react';

import type {
  FriendSummary,
  IncomingRequestSummary,
  OutgoingRequestSummary,
} from '../page';

type AddFriendModalProps = {
  onClose: () => void;
  onRequestResult: (
    result:
      | { type: 'pending'; request: OutgoingRequestSummary }
      | { type: 'accepted'; friend: FriendSummary; requestId?: string | null },
  ) => void;
  existingFriendIds: string[];
  incomingRequests: IncomingRequestSummary[];
  outgoingRequests: OutgoingRequestSummary[];
};

type SearchResult = FriendSummary;

type SearchResponse = {
  results?: SearchResult[];
  error?: string;
};

type RequestResponse =
  | {
      status: 'pending';
      request: { id: string; createdAt: string; to?: FriendSummary };
    }
  | {
      status: 'accepted';
      friend: FriendSummary;
      requestId?: string;
    };

export function AddFriendModal({
  onClose,
  onRequestResult,
  existingFriendIds,
  incomingRequests,
  outgoingRequests,
}: AddFriendModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const excludedIds = useMemo(() => {
    const ids = new Set<string>(existingFriendIds);
    for (const request of incomingRequests) {
      ids.add(request.from.phoneNumber);
    }
    for (const request of outgoingRequests) {
      ids.add(request.to.phoneNumber);
    }
    return ids;
  }, [existingFriendIds, incomingRequests, outgoingRequests]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(trimmed)}`);
      const data = (await response.json().catch(() => null)) as SearchResponse | null;

      if (!response.ok || !data) {
        throw new Error(data?.error ?? 'Unable to search.');
      }

      const filtered = Array.isArray(data.results) ? data.results : [];
      setResults(filtered.filter((result) => !excludedIds.has(result.phoneNumber)));
    } catch (error) {
      console.error(error);
      setSearchError('We could not search right now. Please try again later.');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSend(friend: FriendSummary) {
    setSendingTo(friend.phoneNumber);
    setSearchError(null);
    setFeedback(null);

    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: friend.phoneNumber }),
      });

      const data = (await response.json().catch(() => null)) as RequestResponse & { error?: string } | null;

      if (!response.ok || !data) {
        throw new Error(data?.error ?? 'Unable to send request.');
      }

      if (data.status === 'pending' && data.request) {
        const summary: OutgoingRequestSummary = {
          id: data.request.id,
          createdAt: data.request.createdAt,
          to: data.request.to ?? friend,
        };
        onRequestResult({ type: 'pending', request: summary });
        setFeedback(`Request sent to ${friend.name ?? friend.phoneNumber}.`);
      } else if (data.status === 'accepted' && data.friend) {
        onRequestResult({ type: 'accepted', friend: data.friend, requestId: data.requestId ?? null });
        setFeedback(`${data.friend.name ?? data.friend.phoneNumber} accepted your request!`);
      } else {
        throw new Error('Unexpected response.');
      }

      setResults((current) => current.filter((item) => item.phoneNumber !== friend.phoneNumber));
    } catch (error) {
      console.error(error);
      setSearchError('We could not send that request. Try again later.');
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div aria-hidden className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-[28px] border border-white/10 bg-[var(--panel)]/95 p-6 text-[var(--ink)] shadow-2xl backdrop-blur">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Add a friend</h2>
            <p className="text-sm text-[var(--muted)]">Search by phone number or name to send a request.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/60 text-sm font-semibold text-[var(--ink)] transition-colors duration-200 hover:bg-white"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSearch} className="mt-6 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search friends..."
            className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            disabled={isSearching}
          />
          <button
            type="submit"
            className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchError ? <p className="mt-3 text-sm text-red-500">{searchError}</p> : null}
        {feedback ? <p className="mt-3 text-sm text-emerald-600">{feedback}</p> : null}

        <div className="mt-6 space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {results.length > 0 ? (
            results.map((result) => (
              <div
                key={result.phoneNumber}
                className="flex items-center justify-between gap-3 rounded-[var(--card-radius)] border border-[var(--border)] bg-white/80 px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {result.name ?? 'Unnamed friend'}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{result.phoneNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSend(result)}
                  disabled={sendingTo === result.phoneNumber}
                  className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {sendingTo === result.phoneNumber ? 'Sending...' : 'Add'}
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">{query ? 'No friends found yet.' : 'Try searching to find friends.'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
