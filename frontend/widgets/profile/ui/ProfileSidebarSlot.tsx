"use client";

import { CabinetSidebarSlot } from "@/shared/ui/CabinetSidebarSlot";
import {
  ProfileSidebarNav,
  type ProfileNavSection,
} from "@/widgets/profile/ui/ProfileSidebarNav";

export const PROFILE_SIDEBAR_STORAGE_KEY = "ui.sidebar.profile.collapsed";

type Props = {
  selected: ProfileNavSection;
  onSelectSection?: (section: Exclude<ProfileNavSection, "orders">) => void;
  requestsUnreadCount?: number;
};

/** Сайдбар профиля: общий CabinetSidebarSlot + ProfileSidebarNav. */
export function ProfileSidebarSlot({
  selected,
  onSelectSection,
  requestsUnreadCount,
}: Props) {
  return (
    <CabinetSidebarSlot storageKey={PROFILE_SIDEBAR_STORAGE_KEY}>
      {({ collapsed, onToggleCollapsed }) => (
        <ProfileSidebarNav
          selected={selected}
          onSelectSection={onSelectSection}
          requestsUnreadCount={requestsUnreadCount}
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
      )}
    </CabinetSidebarSlot>
  );
}
