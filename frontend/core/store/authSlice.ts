import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthCity, AuthMembership, SystemRole } from "@/core/auth/authorization";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  systemRole: SystemRole;
  activeProviderId: string | null;
  customerCity: AuthCity | null;
  memberships: AuthMembership[];
};

export type AuthState = {
  status: "unknown" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
  error: string | null;
};

const initialState: AuthState = {
  status: "unknown",
  user: null,
  error: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthenticated(state, action: PayloadAction<AuthUser>) {
      state.status = "authenticated";
      state.user = action.payload;
      state.error = null;
    },
    setUnauthenticated(state) {
      state.status = "unauthenticated";
      state.user = null;
      state.error = null;
    },
    setUnknown(state) {
      state.status = "unknown";
      state.user = null;
      state.error = null;
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setAuthenticated, setUnauthenticated, setUnknown, setAuthError } = authSlice.actions;
export const authReducer = authSlice.reducer;

