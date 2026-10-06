"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

type State<T> = { data: T | null; error: ApiError | Error | null; loading: boolean };

/**
 * Loads data from the API (stale-while-revalidate: previous data stays visible while refetching).
 * `reload()` refetches; a 401 sets `unauthorized` so screens can send the user to /login.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const fnRef = useRef(fn);
  const seq = useRef(0);
  useEffect(() => { fnRef.current = fn; });

  const load = useCallback(() => {
    const mine = ++seq.current;
    return fnRef.current().then(
      (data) => { if (mine === seq.current) setState({ data, error: null, loading: false }); },
      (error) => { if (mine === seq.current) setState((s) => ({ data: s.data, error, loading: false })); },
    );
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, deps);
  return { ...state, reload: load, unauthorized: state.error instanceof ApiError && state.error.status === 401 };
}
