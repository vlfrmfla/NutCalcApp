import NextAuth from "next-auth";
import NaverProvider from "next-auth/providers/naver";

export const authOptions = {
  providers: [
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      console.log("jwt callback:", { token, account });
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("session callback:", { session, token });
      session.accessToken = token.accessToken;
      session.user.id = token.sub; // 네이버 고유 id를 user.id로 할당
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 