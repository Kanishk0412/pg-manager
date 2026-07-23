import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db/client";
import { signToken } from "@/lib/auth/session";

// Demo Fallback Users for Serverless Vercel Deployments
const DEMO_USERS: Record<string, any> = {
  "owner@riddhi.com": {
    id: "demo-owner-riddhi",
    email: "owner@riddhi.com",
    fullName: "Ramesh Sharma (Owner)",
    role: "owner",
    organizationId: "org-riddhi-residency",
    orgName: "Riddhi Residency",
  },
  "manager@riddhi.com": {
    id: "demo-manager-riddhi",
    email: "manager@riddhi.com",
    fullName: "Suresh Kumar (Manager)",
    role: "manager",
    organizationId: "org-riddhi-residency",
    orgName: "Riddhi Residency",
  },
  "owner@apex.com": {
    id: "demo-owner-apex",
    email: "owner@apex.com",
    fullName: "Anita Verma (Apex)",
    role: "owner",
    organizationId: "org-apex-coliving",
    orgName: "Apex Co-Living",
  },
};

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { message: "Email and password are required" } },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    let userPayload: any = null;

    // 1. Try database lookup first
    try {
      const prisma = getDb();
      if (prisma) {
        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
          include: { organization: true },
        });

        if (user && user.status === "active") {
          const isValidPassword = await bcrypt.compare(password, user.password_hash);
          if (isValidPassword) {
            userPayload = {
              id: user.id,
              email: user.email,
              fullName: user.full_name,
              role: user.role,
              organizationId: user.organization_id || "",
              orgName: user.organization?.name || "PG Manager",
            };

            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { last_login_at: new Date() },
              });
            } catch (e) {
              // Ignore DB write errors in read-only lambdas
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn("DB lookup error on login:", dbErr);
    }

    // 2. Demo fallback credentials (guaranteed working on Vercel live link)
    if (!userPayload && DEMO_USERS[cleanEmail]) {
      if (password === "password123") {
        userPayload = DEMO_USERS[cleanEmail];
      }
    }

    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: userPayload.id,
      email: userPayload.email,
      role: userPayload.role,
      organizationId: userPayload.organizationId,
      fullName: userPayload.fullName,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: userPayload,
      },
    });

    response.cookies.set("pgm_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { success: false, error: { message: "An unexpected error occurred. Please try again." } },
      { status: 500 }
    );
  }
}
