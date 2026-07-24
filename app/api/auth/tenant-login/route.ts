import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { signToken } from "@/lib/auth/session";

// Demo Resident Accounts for instant testing
const DEMO_RESIDENTS: Record<string, any> = {
  "rahul@example.com": {
    id: "tenant-rahul-01",
    fullName: "Rahul Sharma",
    phone: "+919811000000",
    email: "rahul@example.com",
    roomNumber: "101",
    bedLabel: "A",
    agreedRent: 8500,
    securityDeposit: 8500,
    moveInDate: "2026-01-01",
    status: "active",
  },
  "+919811000000": {
    id: "tenant-rahul-01",
    fullName: "Rahul Sharma",
    phone: "+919811000000",
    email: "rahul@example.com",
    roomNumber: "101",
    bedLabel: "A",
    agreedRent: 8500,
    securityDeposit: 8500,
    moveInDate: "2026-01-01",
    status: "active",
  },
  "priya@example.com": {
    id: "tenant-priya-02",
    fullName: "Priya Verma",
    phone: "+919811000001",
    email: "priya@example.com",
    roomNumber: "102",
    bedLabel: "A",
    agreedRent: 7000,
    securityDeposit: 7000,
    moveInDate: "2026-02-15",
    status: "active",
  },
  "+919811000001": {
    id: "tenant-priya-02",
    fullName: "Priya Verma",
    phone: "+919811000001",
    email: "priya@example.com",
    roomNumber: "102",
    bedLabel: "A",
    agreedRent: 7000,
    securityDeposit: 7000,
    moveInDate: "2026-02-15",
    status: "active",
  },
};

export async function POST(request: Request) {
  try {
    const { identifier, password, isGoogleLogin, googleEmail, googleName } = await request.json();

    let tenantPayload: any = null;
    const cleanId = (identifier || googleEmail || "").trim().toLowerCase();

    // 1. Google Auth Flow
    if (isGoogleLogin && googleEmail) {
      const cleanGoogleEmail = googleEmail.trim().toLowerCase();
      
      // Look up tenant in database by email
      try {
        const prisma = getDb();
        if (prisma) {
          const tenant = await prisma.tenant.findFirst({
            where: { email: cleanGoogleEmail, deleted_at: null },
            include: { allotments: { include: { room: true, bed: true } } },
          });

          if (tenant) {
            const allotment = tenant.allotments[0];
            tenantPayload = {
              id: tenant.id,
              email: tenant.email || cleanGoogleEmail,
              fullName: tenant.full_name,
              phone: tenant.phone,
              role: "tenant",
              organizationId: tenant.organization_id,
              propertyId: tenant.property_id,
              roomNumber: allotment?.room?.room_number || "101",
              bedLabel: allotment?.bed?.bed_label || "A",
            };
          }
        }
      } catch (e) {
        console.warn("DB lookup error during Google OAuth tenant login:", e);
      }

      // Fallback Google Auth Tenant if not in database
      if (!tenantPayload) {
        tenantPayload = {
          id: `google-tenant-${Date.now()}`,
          email: cleanGoogleEmail,
          fullName: googleName || "Resident User",
          phone: "+919811000099",
          role: "tenant",
          organizationId: "org-riddhi-residency",
          propertyId: "prop-riddhi",
          roomNumber: "101",
          bedLabel: "A",
        };
      }
    }

    // 2. Standard Phone / Email + Password Login
    if (!tenantPayload && cleanId) {
      try {
        const prisma = getDb();
        if (prisma) {
          const tenant = await prisma.tenant.findFirst({
            where: {
              OR: [{ email: cleanId }, { phone: cleanId }],
              deleted_at: null,
            },
            include: { allotments: { include: { room: true, bed: true } } },
          });

          if (tenant) {
            const allotment = tenant.allotments[0];
            tenantPayload = {
              id: tenant.id,
              email: tenant.email || `${cleanId}@resident.com`,
              fullName: tenant.full_name,
              phone: tenant.phone,
              role: "tenant",
              organizationId: tenant.organization_id,
              propertyId: tenant.property_id,
              roomNumber: allotment?.room?.room_number || "101",
              bedLabel: allotment?.bed?.bed_label || "A",
            };
          }
        }
      } catch (e) {
        console.warn("DB lookup error during tenant login:", e);
      }

      // Demo resident accounts fallback
      if (!tenantPayload && DEMO_RESIDENTS[cleanId]) {
        const demo = DEMO_RESIDENTS[cleanId];
        tenantPayload = {
          id: demo.id,
          email: demo.email,
          fullName: demo.fullName,
          phone: demo.phone,
          role: "tenant",
          organizationId: "org-riddhi-residency",
          propertyId: "prop-riddhi",
          roomNumber: demo.roomNumber,
          bedLabel: demo.bedLabel,
        };
      }
    }

    // Default fallback tenant if user enters any valid phone/email
    if (!tenantPayload && (identifier || isGoogleLogin)) {
      tenantPayload = {
        id: `tenant-${Date.now()}`,
        email: cleanId.includes("@") ? cleanId : `${cleanId}@resident.com`,
        fullName: cleanId.includes("@") ? cleanId.split("@")[0] : "Resident User",
        phone: cleanId.startsWith("+") ? cleanId : `+91${cleanId}`,
        role: "tenant",
        organizationId: "org-riddhi-residency",
        propertyId: "prop-riddhi",
        roomNumber: "101",
        bedLabel: "A",
      };
    }

    if (!tenantPayload) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid Phone Number, Email, or Password" } },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: tenantPayload.id,
      email: tenantPayload.email,
      role: "tenant",
      organizationId: tenantPayload.organizationId,
      fullName: tenantPayload.fullName,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        tenant: tenantPayload,
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
    console.error("Tenant login API error:", error);
    return NextResponse.json(
      { success: false, error: { message: "An unexpected error occurred. Please try again." } },
      { status: 500 }
    );
  }
}
