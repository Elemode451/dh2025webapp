import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    phoneNumber: string;
  }

  interface Session {
    user: {
      id: string;
      phoneNumber: string;
      name: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    phoneNumber: string;
    name: string | null;
  }
}
