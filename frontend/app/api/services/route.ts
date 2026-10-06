import { NextResponse } from "next/server";
import { fetchBackend } from "@/shared/api/backend/server";

const SERVICES_FETCH_ERROR_MESSAGE = "Не удалось загрузить услуги";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cityId = url.searchParams.get("cityId");
    const excludeCityId = url.searchParams.get("excludeCityId");

    const qs = new URLSearchParams();
    if (cityId) qs.set("cityId", cityId);
    if (excludeCityId) qs.set("excludeCityId", excludeCityId);

    const response = await fetchBackend(`/services${qs.toString() ? `?${qs.toString()}` : ""}`);
    const payload = await response.json().catch(() => ({ error: SERVICES_FETCH_ERROR_MESSAGE }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: SERVICES_FETCH_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}
