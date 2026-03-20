import { PrismaClient, TrackingType } from "@prisma/client";

const prisma = new PrismaClient();

const defaultSymptoms = [
  { name: "Headache", category: "pain" },
  { name: "Fatigue", category: "general" },
  { name: "Joint Pain", category: "pain" },
  { name: "Muscle Pain", category: "pain" },
  { name: "Nausea", category: "digestive" },
  { name: "Brain Fog", category: "neurological" },
  { name: "Dizziness", category: "neurological" },
  { name: "Insomnia", category: "general" },
  { name: "Anxiety", category: "neurological" },
  { name: "Stomach Pain", category: "digestive" },
  { name: "Back Pain", category: "pain" },
];

const defaultHabits: { name: string; tracking_type: TrackingType; unit?: string }[] = [
  { name: "Sleep Duration", tracking_type: "duration", unit: "hours" },
  { name: "Water Intake", tracking_type: "numeric", unit: "glasses" },
  { name: "Exercise", tracking_type: "boolean" },
  { name: "Alcohol", tracking_type: "boolean" },
  { name: "Caffeine", tracking_type: "numeric", unit: "cups" },
];

async function main() {
  const existingSymptoms = await prisma.symptom.count({ where: { user_id: null } });
  if (existingSymptoms === 0) {
    console.log("Seeding default symptoms...");
    await prisma.symptom.createMany({
      data: defaultSymptoms.map((s) => ({
        user_id: null,
        name: s.name,
        category: s.category,
      })),
    });
  } else {
    console.log("Default symptoms already exist, skipping.");
  }

  const existingHabits = await prisma.habit.count({ where: { user_id: null } });
  if (existingHabits === 0) {
    console.log("Seeding default habits...");
    await prisma.habit.createMany({
      data: defaultHabits.map((h) => ({
        user_id: null,
        name: h.name,
        tracking_type: h.tracking_type,
        unit: h.unit ?? null,
      })),
    });
  } else {
    console.log("Default habits already exist, skipping.");
  }

  console.log("Seeding complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
