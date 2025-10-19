import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  enableTestFixture,
  ensureDevTestingPlantFixture,
  isTestFixtureEnabled,
} from "@/lib/test-fixture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ enabled: false }, { status: 404 });
  }

  return NextResponse.json({ enabled: isTestFixtureEnabled() });
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();

  if (!session?.user?.phoneNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTestFixtureEnabled()) {
    await enableTestFixture(session.user.phoneNumber);
  } else {
    await ensureDevTestingPlantFixture(session.user.phoneNumber);
  }

  return NextResponse.json({ enabled: true });
}
