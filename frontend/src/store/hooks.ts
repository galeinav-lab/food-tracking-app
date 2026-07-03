// Pre-typed Redux hooks — the standard RTK + TypeScript pattern. Define the typed
// versions ONCE here so every component gets autocomplete + type-checking for free.
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

// Use these throughout the app instead of plain useDispatch/useSelector so
// dispatch knows about thunks and selectors are typed against RootState.
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
