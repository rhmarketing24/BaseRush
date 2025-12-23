import { NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function GET(req: Request) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { error: "Missing Neynar API key" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const fid = searchParams.get("fid");

  if (!fid) {
    return NextResponse.json(
      { error: "FID is required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          "Content-Type": "application/json",
          "api_key": NEYNAR_API_KEY,
        },
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch from Neynar");
    }

    const data = await res.json();
    const user = data.users?.[0];

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfp: user.pfp_url,
      followerCount: user.follower_count,
      followingCount: user.following_count,
      score: user.experimental?.neynar_user_score ?? null,
    });
  } catch (err) {
    console.error("Neynar error:", err);
    return NextResponse.json(
      { error: "Neynar fetch failed" },
      { status: 500 }
    );
  }
}
