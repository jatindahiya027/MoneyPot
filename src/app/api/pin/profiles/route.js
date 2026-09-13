import { NextResponse } from "next/server";
import { getDb } from "@/libs/db";
import { maskEmail } from "@/libs/userIdentity.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const profiles = await db.all(`
    SELECT users.userid, users.name, users.mail, users.image,
      CASE WHEN user_preferences.pin_enabled=1 AND user_preferences.pin_hash<>'' THEN 1 ELSE 0 END AS pin_enabled
    FROM users
    LEFT JOIN user_preferences ON user_preferences.userid=users.userid
    ORDER BY lower(users.name), users.userid
  `);
  return NextResponse.json({
    success: true,
    profiles: profiles.map(profile => ({
      userid: profile.userid,
      name: profile.name,
      image: profile.image,
      mail_hint: maskEmail(profile.mail),
      pin_enabled: Boolean(profile.pin_enabled),
    })),
  });
}
