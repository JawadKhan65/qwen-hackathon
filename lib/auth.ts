import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { dbConnect } from "./mongodb";
import { User } from "./models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret",
    }),
    CredentialsProvider({
      name: "Demo Account (Gmail Bypass)",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@gmail.com" },
        name: { label: "Name", type: "text", placeholder: "Demo Creator" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        
        await dbConnect();
        
        let user = await User.findOne({ email: credentials.email });
        if (!user) {
          user = await User.create({
            email: credentials.email,
            name: credentials.name || "Demo Creator",
            image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(credentials.name || "Demo")}`,
          });
        }
        
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await dbConnect();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          await User.create({
            email: user.email,
            name: user.name,
            image: user.image,
          });
        }
      }
      return true;
    },
    async session({ session, token }: any) {
      await dbConnect();
      if (session?.user && token?.id) {
        session.user.id = token.id;
      } else if (session?.user?.email) {
        const dbUser = await User.findOne({ email: session.user.email });
        if (dbUser) {
          session.user.id = dbUser._id.toString();
        }
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
};
