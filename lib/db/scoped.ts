import { db } from "./client";

/**
 * Multi-tenant Scoped Repository
 * Enforces organization_id on every query to prevent cross-tenant data leaks.
 */
export class ScopedDb {
  constructor(public organizationId: string) {
    if (!organizationId) {
      throw new Error("Multi-tenant security error: organizationId is required");
    }
  }

  // Properties
  async getProperties() {
    return db.property.findMany({
      where: { organization_id: this.organizationId, deleted_at: null },
      include: { settings: true },
    });
  }

  async getProperty(id: string) {
    return db.property.findFirst({
      where: { id, organization_id: this.organizationId, deleted_at: null },
      include: { settings: true, charge_heads: true },
    });
  }

  // Charge Heads
  async getChargeHeads(propertyId: string) {
    return db.chargeHead.findMany({
      where: { organization_id: this.organizationId, property_id: propertyId, deleted_at: null },
      orderBy: { sort_order: "asc" },
    });
  }

  // Rooms & Beds
  async getRooms(propertyId: string) {
    return db.room.findMany({
      where: { organization_id: this.organizationId, property_id: propertyId, deleted_at: null },
      include: {
        beds: {
          where: { deleted_at: null },
          include: {
            allotments: {
              where: { status: "active", deleted_at: null },
              include: { tenant: true },
            },
          },
        },
      },
      orderBy: [{ floor: "asc" }, { room_number: "asc" }],
    });
  }

  async getRoom(id: string) {
    return db.room.findFirst({
      where: { id, organization_id: this.organizationId, deleted_at: null },
      include: {
        beds: {
          where: { deleted_at: null },
          include: {
            allotments: {
              where: { status: { in: ["active", "reserved", "on_notice"] }, deleted_at: null },
              include: { tenant: true },
            },
          },
        },
        meter_readings: {
          orderBy: { billing_month: "desc" },
          take: 5,
        },
      },
    });
  }

  // Tenants
  async getTenants(propertyId: string, statusFilter?: string) {
    const whereClause: any = {
      organization_id: this.organizationId,
      property_id: propertyId,
      deleted_at: null,
    };
    if (statusFilter && statusFilter !== "all") {
      whereClause.status = statusFilter;
    }
    return db.tenant.findMany({
      where: whereClause,
      include: {
        allotments: {
          where: { deleted_at: null },
          include: { room: true, bed: true },
          orderBy: { move_in_date: "desc" },
        },
      },
      orderBy: { full_name: "asc" },
    });
  }

  async getTenant(id: string) {
    return db.tenant.findFirst({
      where: { id, organization_id: this.organizationId, deleted_at: null },
      include: {
        allotments: {
          where: { deleted_at: null },
          include: { room: true, bed: true, invoices: true },
          orderBy: { move_in_date: "desc" },
        },
        invoices: {
          where: { deleted_at: null },
          orderBy: { issue_date: "desc" },
        },
        payments: {
          where: { deleted_at: null },
          orderBy: { paid_at: "desc" },
        },
        notification_logs: {
          orderBy: { created_at: "desc" },
          take: 20,
        },
      },
    });
  }

  // Allotments
  async getAllotments(propertyId: string) {
    return db.allotment.findMany({
      where: { organization_id: this.organizationId, property_id: propertyId, deleted_at: null },
      include: { tenant: true, room: true, bed: true },
      orderBy: { move_in_date: "desc" },
    });
  }

  // Meter Readings
  async getMeterReadings(propertyId: string, month: Date) {
    return db.meterReading.findMany({
      where: {
        organization_id: this.organizationId,
        property_id: propertyId,
        billing_month: month,
        deleted_at: null,
      },
      include: { room: true },
    });
  }

  // Invoices
  async getInvoices(propertyId: string) {
    return db.invoice.findMany({
      where: { organization_id: this.organizationId, property_id: propertyId, deleted_at: null },
      include: { tenant: true, room: true, bed: true, line_items: true },
      orderBy: { issue_date: "desc" },
    });
  }

  // Payments
  async getPayments(propertyId: string) {
    return db.payment.findMany({
      where: { organization_id: this.organizationId, property_id: propertyId, deleted_at: null },
      include: { tenant: true, invoice: true },
      orderBy: { paid_at: "desc" },
    });
  }
}
