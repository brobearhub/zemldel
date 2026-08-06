import type { ReactNode } from "react";
import { ProCabinetLayout } from "@/widgets/pro-dashboard/ui/ProCabinetLayout";

interface Props {
  readonly children: ReactNode;
}

export default function ProLayout({ children }: Props) {
  return <ProCabinetLayout>{children}</ProCabinetLayout>;
}
