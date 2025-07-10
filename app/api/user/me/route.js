import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const naverRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/xml",
        "Accept": "*/*"
      },
      method: "GET"
    });
    const data = await naverRes.json();
    // 네이버 응답 예시: { response: { name, nickname, birthyear, ... } }
    const { name, nickname, birthyear } = data.response || {};
    return new Response(JSON.stringify({ name, nickname, birthyear }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to fetch user info" }), { status: 500 });
  }
} 