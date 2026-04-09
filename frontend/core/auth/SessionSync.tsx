"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch } from "@/core/store/hooks";
import { setAuthenticated, setUnauthenticated, setUnknown } from "@/core/store/authSlice";

export function SessionSync() {
  const dispatch = useAppDispatch();
  const { data, status } = useSession();

  useEffect(() => {
    if (status === "loading") {
      dispatch(setUnknown());
      return;
    }

    if (status === "unauthenticated") {
      dispatch(setUnauthenticated());
      return;
    }

    const user = data?.user;
    if (user?.id) {
      dispatch(
        setAuthenticated({
          id: user.id,
          email: user.email ?? null,
          name: user.name ?? null,
          image: user.image ?? null,
          systemRole: user.systemRole,
          activeProviderId: user.activeProviderId,
          customerCity: user.customerCity ?? null,
          memberships: user.memberships,
        })
      );
      return;
    }

    dispatch(setUnauthenticated());
  }, [data?.user, dispatch, status]);

  return null;
}

