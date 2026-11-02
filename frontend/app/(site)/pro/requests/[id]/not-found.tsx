import { RequestUnavailableNotice } from "@/shared/ui/RequestUnavailableNotice";

export default function NotFound() {
  return <RequestUnavailableNotice returnHref="/pro/requests" />;
}
