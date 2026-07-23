import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting PG Manager seed...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.meterReading.deleteMany();
  await prisma.allotment.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.chargeHead.deleteMany();
  await prisma.userPropertyAccess.deleteMany();
  await prisma.propertySettings.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Organization 1: Riddhi Residency
  const org1 = await prisma.organization.create({
    data: {
      name: "Riddhi Residency",
      slug: "riddhi-residency",
      plan: "pro",
      status: "active",
      max_properties: 5,
      max_rooms: 100,
      max_users: 10,
    },
  });

  // Users for Org 1
  const ownerUser = await prisma.user.create({
    data: {
      organization_id: org1.id,
      full_name: "Ramesh Sharma",
      email: "owner@riddhi.com",
      phone: "+919876543210",
      password_hash: passwordHash,
      role: "owner",
      status: "active",
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      organization_id: org1.id,
      full_name: "Suresh Kumar (Manager)",
      email: "manager@riddhi.com",
      phone: "+919876543211",
      password_hash: passwordHash,
      role: "manager",
      status: "active",
    },
  });

  // Update Org 1 owner
  await prisma.organization.update({
    where: { id: org1.id },
    data: { owner_user_id: ownerUser.id },
  });

  // Property 1: Riddhi Residency Building
  const prop1 = await prisma.property.create({
    data: {
      organization_id: org1.id,
      name: "Riddhi Residency",
      legal_name: "Riddhi Co-Living Enterprises Pvt Ltd",
      code: "RIDDHI",
      address_line1: "124, 5th Cross, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      phone: "+919876543210",
      email: "contact@riddhiresidency.com",
      brand_color: "#16a34a", // Vibrant emerald green
      currency_code: "INR",
      currency_symbol: "₹",
      timezone: "Asia/Kolkata",
    },
  });

  // Access mapping
  await prisma.userPropertyAccess.createMany({
    data: [
      { user_id: ownerUser.id, property_id: prop1.id },
      { user_id: managerUser.id, property_id: prop1.id },
    ],
  });

  // Settings for Property 1
  await prisma.propertySettings.create({
    data: {
      property_id: prop1.id,
      electricity_rate_per_unit: 10.0,
      electricity_split_mode: "equal",
      bill_generation_day: 1,
      payment_due_day: 5,
      prorate_partial_month: true,
      late_fee_enabled: true,
      late_fee_type: "flat",
      late_fee_amount: 200.0,
      late_fee_grace_days: 5,
      invoice_prefix: "INV",
      receipt_prefix: "RCP",
      notice_period_days: 30,
      security_deposit_months: 1,
      sharing_types: JSON.stringify([
        { type: "Single", capacity: 1, default_rent: 8000 },
        { type: "Double", capacity: 2, default_rent: 6000 },
        { type: "Triple", capacity: 3, default_rent: 5000 },
      ]),
      amenities_list: JSON.stringify([
        "AC",
        "Attached Bathroom",
        "Balcony",
        "Geyser",
        "Almirah",
        "Study Table",
        "Window",
      ]),
      floor_labels: JSON.stringify(["Ground", "1st Floor", "2nd Floor"]),
    },
  });

  // Charge Heads for Property 1
  const rentHead = await prisma.chargeHead.create({
    data: {
      organization_id: org1.id,
      property_id: prop1.id,
      name: "Room Rent",
      code: "RENT",
      type: "recurring_monthly",
      applies_to: "per_bed",
      is_system: true,
      sort_order: 1,
    },
  });

  const elecHead = await prisma.chargeHead.create({
    data: {
      organization_id: org1.id,
      property_id: prop1.id,
      name: "Electricity Charges",
      code: "ELEC",
      type: "usage_based",
      applies_to: "per_room",
      is_system: true,
      sort_order: 2,
    },
  });

  const lateHead = await prisma.chargeHead.create({
    data: {
      organization_id: org1.id,
      property_id: prop1.id,
      name: "Late Fee",
      code: "LATE_FEE",
      type: "one_time",
      default_amount: 200,
      applies_to: "per_tenant",
      is_system: true,
      sort_order: 3,
    },
  });

  const depositHead = await prisma.chargeHead.create({
    data: {
      organization_id: org1.id,
      property_id: prop1.id,
      name: "Security Deposit",
      code: "DEPOSIT",
      type: "one_time",
      applies_to: "per_tenant",
      is_system: true,
      sort_order: 4,
    },
  });

  await prisma.chargeHead.createMany({
    data: [
      {
        organization_id: org1.id,
        property_id: prop1.id,
        name: "Food / Mess",
        code: "FOOD",
        type: "recurring_monthly",
        default_amount: 2500,
        applies_to: "per_tenant",
        is_active: false,
        sort_order: 5,
      },
      {
        organization_id: org1.id,
        property_id: prop1.id,
        name: "High Speed WiFi",
        code: "WIFI",
        type: "recurring_monthly",
        default_amount: 300,
        applies_to: "per_tenant",
        is_active: false,
        sort_order: 6,
      },
      {
        organization_id: org1.id,
        property_id: prop1.id,
        name: "Laundry Service",
        code: "LAUNDRY",
        type: "recurring_monthly",
        default_amount: 500,
        applies_to: "per_tenant",
        is_active: false,
        sort_order: 7,
      },
    ],
  });

  // 2. Generate 45 Rooms for Riddhi Residency
  // Ground floor: G01 - G15 (Single, 1 bed @ ₹8,000)
  // 1st floor: 101 - 115 (Double, 2 beds @ ₹6,000)
  // 2nd floor: 201 - 215 (Triple, 3 beds @ ₹5,000)
  const roomConfigs = [
    { floor: "Ground", prefix: "G", count: 15, sharing: "Single", capacity: 1, rent: 8000, pad: 2 },
    { floor: "1st Floor", prefix: "1", count: 15, sharing: "Double", capacity: 2, rent: 6000, pad: 2 },
    { floor: "2nd Floor", prefix: "2", count: 15, sharing: "Triple", capacity: 3, rent: 5000, pad: 2 },
  ];

  const createdBeds: any[] = [];
  const createdRooms: any[] = [];

  for (const cfg of roomConfigs) {
    for (let i = 1; i <= cfg.count; i++) {
      const numStr = cfg.prefix === "G" ? `G${i.toString().padStart(2, "0")}` : `${cfg.prefix}${i.toString().padStart(2, "0")}`;
      const room = await prisma.room.create({
        data: {
          organization_id: org1.id,
          property_id: prop1.id,
          room_number: numStr,
          floor: cfg.floor,
          sharing_type: cfg.sharing,
          capacity: cfg.capacity,
          rent_mode: "per_bed",
          default_rent: cfg.rent,
          meter_number: `MTR-${numStr}`,
          amenities: JSON.stringify(["AC", "Geyser", "Almirah", "Attached Bathroom"]),
        },
      });
      createdRooms.push(room);

      // Create Beds: A, B, C...
      const bedLabels = ["A", "B", "C", "D"];
      for (let b = 0; b < cfg.capacity; b++) {
        const bed = await prisma.bed.create({
          data: {
            organization_id: org1.id,
            room_id: room.id,
            bed_label: bedLabels[b],
            status: "vacant",
          },
        });
        createdBeds.push({ ...bed, room });
      }
    }
  }

  console.log(`✅ Created ${createdRooms.length} rooms and ${createdBeds.length} beds.`);

  // 3. Create Tenants and Allotments
  // Target: 60 occupied beds, 5 reserved beds, 25 vacant beds.
  const sampleNames = [
    "Rahul Sharma", "Priya Verma", "Ankit Patel", "Sneha Reddy", "Vikram Singh",
    "Aditi Rao", "Rohan Mehta", "Kavya Nair", "Deepak Joshi", "Neha Kapoor",
    "Amitabh Das", "Pooja Hegde", "Siddharth Malhotra", "Divya Agarwal", "Varun Dhawan",
    "Ananya Panday", "Karan Johar", "Shraddha Kapoor", "Ayushmann Khurrana", "Taapsee Pannu",
    "Rajkummar Rao", "Kriti Sanon", "Vicky Kaushal", "Yami Gautam", "Kartik Aaryan",
    "Sara Ali Khan", "Tiger Shroff", "Kiara Advani", "Ranbir Kapoor", "Alia Bhatt",
    "Ranveer Singh", "Deepika Padukone", "Shahid Kapoor", "Mira Rajput", "Aditya Roy Kapur",
    "Disha Patani", "Sushant Rajput", "Parineeti Chopra", "Arjun Kapoor", "Sonam Kapoor",
    "Ishaan Khatter", "Janhvi Kapoor", "Abhimanyu Dassani", "Radhika Madan", "Sharvari Wagh",
    "Siddhant Chaturvedi", "Mrunal Thakur", "Sunny Kaushal", "Nushrratt Bharuccha", "Pulkit Samrat",
    "Kriti Kharbanda", "Harshvardhan Rane", "Meezaan Jafri", "Pranutan Bahl", "Zaheer Iqbal",
    "Tara Sutaria", "Ahan Shetty", "Pashmina Roshan", "Kushi Kapoor", "Agastya Nanda",
    "Suhaana Khan", "Ibrahim Ali Khan", "Aaman Devgan", "Rasha Thadani", "Vedang Raina"
  ];

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const futureMoveIn = new Date(now.getFullYear(), now.getMonth() + 1, 15);

  let bedIndex = 0;
  // Occupy 60 beds
  for (let i = 0; i < 60; i++) {
    const bed = createdBeds[bedIndex++];
    const name = sampleNames[i % sampleNames.length];
    const phone = `+91981${(1000000 + i).toString()}`;

    const tenant = await prisma.tenant.create({
      data: {
        organization_id: org1.id,
        property_id: prop1.id,
        full_name: name,
        phone,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        gender: i % 2 === 0 ? "Male" : "Female",
        id_proof_type: "aadhaar",
        id_proof_number: `XXXX-XXXX-${1000 + i}`,
        status: "active",
        whatsapp_opt_in: true,
      },
    });

    const isOnNotice = i >= 10 && i < 13;
    const noticeDate = isOnNotice ? twoMonthsAgo : null;
    const expectedMoveOut = isOnNotice ? new Date(now.getFullYear(), now.getMonth() + 1, 5) : null;

    const allotment = await prisma.allotment.create({
      data: {
        organization_id: org1.id,
        property_id: prop1.id,
        tenant_id: tenant.id,
        room_id: bed.room.id,
        bed_id: bed.id,
        status: isOnNotice ? "on_notice" : "active",
        booking_date: threeMonthsAgo,
        move_in_date: threeMonthsAgo,
        notice_given_date: noticeDate,
        expected_move_out_date: expectedMoveOut,
        agreed_rent: bed.room.default_rent,
        security_deposit_amount: bed.room.default_rent,
        security_deposit_paid: bed.room.default_rent,
      },
    });

    if (isOnNotice) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: "on_notice" },
      });
    }

    // Update Bed status
    await prisma.bed.update({
      where: { id: bed.id },
      data: { status: "occupied", current_allotment_id: allotment.id },
    });
  }

  // Reserve 5 beds for future
  for (let i = 60; i < 65; i++) {
    const bed = createdBeds[bedIndex++];
    const name = sampleNames[i % sampleNames.length];
    const phone = `+91981${(1000000 + i).toString()}`;

    const tenant = await prisma.tenant.create({
      data: {
        organization_id: org1.id,
        property_id: prop1.id,
        full_name: `${name} (Upcoming)`,
        phone,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        id_proof_type: "pan",
        id_proof_number: `ABCDE${1000 + i}F`,
        status: "upcoming",
      },
    });

    const allotment = await prisma.allotment.create({
      data: {
        organization_id: org1.id,
        property_id: prop1.id,
        tenant_id: tenant.id,
        room_id: bed.room.id,
        bed_id: bed.id,
        status: "reserved",
        booking_date: now,
        move_in_date: futureMoveIn,
        agreed_rent: bed.room.default_rent,
        security_deposit_amount: bed.room.default_rent,
        booking_advance_amount: 2000,
      },
    });

    await prisma.bed.update({
      where: { id: bed.id },
      data: { status: "reserved", current_allotment_id: allotment.id },
    });
  }

  console.log("✅ Occupied 60 beds and reserved 5 beds (25 remaining vacant).");

  // 4. Create Meter Readings, Invoices, and Payments for 3 months
  // Seed readings & invoices for active rooms
  const activeAllotments = await prisma.allotment.findMany({
    where: { organization_id: org1.id, status: "active" },
    include: { tenant: true, room: true, bed: true },
  });

  const months = [threeMonthsAgo, twoMonthsAgo, currentMonthStart];
  let invCounter = 1;
  let rcpCounter = 1;

  for (const month of months) {
    const yyyymm = `${month.getFullYear()}${(month.getMonth() + 1).toString().padStart(2, "0")}`;

    // Seed Meter Readings per room
    for (const room of createdRooms) {
      const prevReading = (month.getMonth() + 1) * 100;
      const currReading = prevReading + 85 + Math.floor(Math.random() * 30);
      const units = currReading - prevReading;
      const rate = 10.0;
      const amount = units * rate;

      await prisma.meterReading.create({
        data: {
          organization_id: org1.id,
          property_id: prop1.id,
          room_id: room.id,
          billing_month: month,
          previous_reading: prevReading,
          current_reading: currReading,
          units_consumed: units,
          rate_per_unit: rate,
          amount,
          reading_date: month,
          entered_by_user_id: managerUser.id,
        },
      });
    }

    // Seed Invoices & Payments for active allotments
    for (const allotment of activeAllotments) {
      const roomElecUnits = 90;
      const roomOccupants = allotment.room.capacity;
      const tenantElecAmount = Math.round((roomElecUnits * 10) / roomOccupants);
      const rentAmount = allotment.agreed_rent;
      const totalAmount = rentAmount + tenantElecAmount;

      const invNum = `INV-RIDDHI-${yyyymm}-${invCounter.toString().padStart(4, "0")}`;
      invCounter++;

      const isCurrentMonth = month.getTime() === currentMonthStart.getTime();
      let status = "paid";
      let amountPaid = totalAmount;

      if (isCurrentMonth) {
        // Mix of paid, partially paid, and overdue for current month dashboard demonstration
        const rand = Math.random();
        if (rand < 0.5) {
          status = "paid";
          amountPaid = totalAmount;
        } else if (rand < 0.8) {
          status = "partially_paid";
          amountPaid = Math.round(totalAmount / 2);
        } else {
          status = "overdue";
          amountPaid = 0;
        }
      }

      const balanceDue = totalAmount - amountPaid;

      const invoice = await prisma.invoice.create({
        data: {
          organization_id: org1.id,
          property_id: prop1.id,
          invoice_number: invNum,
          tenant_id: allotment.tenant_id,
          allotment_id: allotment.id,
          room_id: allotment.room_id,
          bed_id: allotment.bed_id,
          billing_month: month,
          period_start: month,
          period_end: new Date(month.getFullYear(), month.getMonth() + 1, 0),
          issue_date: month,
          due_date: new Date(month.getFullYear(), month.getMonth(), 5),
          subtotal: totalAmount,
          total_amount: totalAmount,
          amount_paid: amountPaid,
          balance_due: balanceDue,
          status,
          generated_by: "auto",
        },
      });

      // Line items
      await prisma.invoiceLineItem.createMany({
        data: [
          {
            invoice_id: invoice.id,
            charge_head_id: rentHead.id,
            description: `Room Rent (${allotment.room.room_number}, Bed ${allotment.bed.bed_label})`,
            quantity: 1,
            unit_price: rentAmount,
            amount: rentAmount,
            sort_order: 1,
          },
          {
            invoice_id: invoice.id,
            charge_head_id: elecHead.id,
            description: `Electricity — 90 units × ₹10 = ₹900, split ${roomOccupants} ways`,
            quantity: 1,
            unit_price: tenantElecAmount,
            amount: tenantElecAmount,
            sort_order: 2,
          },
        ],
      });

      // Record Payments if paid or partially paid
      if (amountPaid > 0) {
        const rcpNum = `RCP-RIDDHI-${yyyymm}-${rcpCounter.toString().padStart(4, "0")}`;
        rcpCounter++;

        await prisma.payment.create({
          data: {
            organization_id: org1.id,
            property_id: prop1.id,
            receipt_number: rcpNum,
            tenant_id: allotment.tenant_id,
            invoice_id: invoice.id,
            amount: amountPaid,
            payment_method: "upi",
            reference_number: `UPI-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
            paid_at: new Date(month.getFullYear(), month.getMonth(), 3),
            recorded_by_user_id: managerUser.id,
            status: "recorded",
          },
        });
      }
    }
  }

  console.log("✅ Seeded 3 months of meter readings, invoices, and payments.");

  // 5. Create Organization 2: Apex Co-Living (Test Org for Multi-Tenant Isolation)
  const org2 = await prisma.organization.create({
    data: {
      name: "Apex Co-Living",
      slug: "apex-coliving",
      plan: "starter",
      status: "active",
    },
  });

  const org2Owner = await prisma.user.create({
    data: {
      organization_id: org2.id,
      full_name: "Apex Admin",
      email: "owner@apex.com",
      phone: "+919999988888",
      password_hash: passwordHash,
      role: "owner",
      status: "active",
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      organization_id: org2.id,
      name: "Apex Heights",
      code: "APEX",
      city: "Mumbai",
      currency_code: "INR",
      brand_color: "#3b82f6",
    },
  });

  await prisma.userPropertyAccess.create({
    data: { user_id: org2Owner.id, property_id: prop2.id },
  });

  await prisma.propertySettings.create({
    data: { property_id: prop2.id },
  });

  const org2Room = await prisma.room.create({
    data: {
      organization_id: org2.id,
      property_id: prop2.id,
      room_number: "101-APEX",
      floor: "1st Floor",
      sharing_type: "Single",
      capacity: 1,
      default_rent: 12000,
    },
  });

  await prisma.bed.create({
    data: {
      organization_id: org2.id,
      room_id: org2Room.id,
      bed_label: "A",
      status: "vacant",
    },
  });

  console.log("✅ Created Organization 2 (Apex Co-Living) for Multi-Tenant Isolation testing.");
  console.log("\n🎉 Seed complete! Default Login Credentials:");
  console.log("------------------------------------------");
  console.log("Org 1 Owner:   owner@riddhi.com / password123");
  console.log("Org 1 Manager: manager@riddhi.com / password123");
  console.log("Org 2 Owner:   owner@apex.com / password123");
  console.log("------------------------------------------\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
