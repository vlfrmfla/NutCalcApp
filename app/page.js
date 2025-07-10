import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import LoginUI from "./components/LoginUI";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <LoginUI />;
  }

  // 로그인된 경우: 메인 UI (네비게이션 바 포함)
  return (
    <div>
      <h1>양액 계산 앱</h1>
      <p>양액 농도를 계산하고 관리하세요!</p>
      <p>왼쪽의 탭을 선택하여 양액조성을 계산하고 시계열 급배액 데이터를 관리할 수 있습니다.</p>
      <nav>
      </nav>
    </div>
  );
}
