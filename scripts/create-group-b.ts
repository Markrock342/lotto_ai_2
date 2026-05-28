import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_RATES = {
  fourStraight: 120_000,
  fourTod: 4_000,
  threeStraight: 35_000,
  threeTod: 3_000,
  threeFront: 2_000,
  twoFront: 1_500,
  twoBack: 1_500,
};

async function main() {
  const houseName = "กลุ่ม B";
  const customerList = ["#พี่แป้ง", "#พี่แอม"];
  
  // Check if it already exists
  const existing = await prisma.house.findFirst({
    where: { name: houseName }
  });
  
  if (existing) {
    console.log(`House ${houseName} already exists! ID: ${existing.id}`);
    return;
  }

  const house = await prisma.house.create({
    data: {
      name: houseName,
      pricePerSet: 80,
      ratesJson: JSON.stringify(DEFAULT_RATES),
      customerListJson: JSON.stringify(customerList)
    },
  });

  const adminPassword = "Admin@GroupB";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      houseId: house.id,
      username: "admin_b",
      passwordHash: adminHash,
      displayName: "แอดมินกลุ่ม B",
      role: "admin",
    },
  });

  await prisma.draw.create({
    data: {
      houseId: house.id,
      label: "งวดเริ่มต้น (กลุ่ม B)",
      status: "open",
    },
  });

  console.log(`Successfully created house: ${houseName}`);
  console.log(`Admin Username: admin_b`);
  console.log(`Admin Password: ${adminPassword}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
