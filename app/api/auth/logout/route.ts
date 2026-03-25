import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/app/lib/db";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (token) {
    deleteSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("session");
  response.cookies.delete("site_auth");
  return response;
}
