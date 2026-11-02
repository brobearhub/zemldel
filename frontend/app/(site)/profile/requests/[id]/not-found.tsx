import { RequestUnavailableNotice } from "@/shared/ui/RequestUnavailableNotice";

export default function NotFound() {
  return <RequestUnavailableNotice returnHref="/profile?section=requests" />;
}
