import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/client";
import { signToken } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { message: "Email and password are required" } },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user || user.status !== "active") {
      return NextResponse.json(
        { success: false, error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    if (!user.organization_id && user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { message: "User is not assigned to an organization" } },
        { status: 403 }
      );
    }

    // Update last login timestamp
    await db.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id || "",
      fullName: user.full_name,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          organizationId: user.organization_id,
          orgName: user.organization?.name,
        },
      },
    });

    // Set cookie explicitly on response object
    response.cookies.set("pgm_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
