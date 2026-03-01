import { db } from "../db";
  import { contacts, cameraFeeds, moduleHealth } from "@shared/schema";

  async function seed() {
    console.log("🌱 Seeding database...");

    try {
      // Seed emergency contacts
      const contactsData = [
        {
          name: "Fire Department - Station 1",
          phone: "+1-555-0101",
          email: "station1@fire.gov",
          role: "fire",
          priority: 1,
          isActive: true,
        },
        {
          name: "Police Department - Central",
          phone: "+1-555-0102",
          email: "central@police.gov",
          role: "police",
          priority: 1,
          isActive: true,
        },
        {
          name: "Emergency Medical Services",
          phone: "+1-555-0103",
          email: "dispatch@ems.gov",
          role: "medical",
          priority: 1,
          isActive: true,
        },
        {
          name: "Chief Emergency Coordinator",
          phone: "+1-555-0104",
          email: "coordinator@emergency.gov",
          role: "coordinator",
          priority: 1,
          isActive: true,
        },
        {
          name: "First Responder Team Alpha",
          phone: "+1-555-0105",
          email: "alpha@responders.gov",
          role: "first_responder",
          priority: 2,
          isActive: true,
        },
        {
          name: "First Responder Team Bravo",
          phone: "+1-555-0106",
          email: "bravo@responders.gov",
          role: "first_responder",
          priority: 2,
          isActive: true,
        },
      ];

      await db.insert(contacts).values(contactsData);
      console.log(`✅ Seeded ${contactsData.length} emergency contacts`);

      // Seed camera feeds
      const cameraFeedsData = [
        {
          name: "Downtown Intersection Cam 1",
          location: "Main St & 1st Ave",
          streamUrl: null,
          isActive: true,
          metadata: { type: "traffic", coverage: "intersection" },
        },
        {
          name: "City Hall Entrance",
          location: "City Hall - Front Entrance",
          streamUrl: null,
          isActive: true,
          metadata: { type: "security", coverage: "building" },
        },
        {
          name: "Central Park North",
          location: "Central Park - North Gate",
          streamUrl: null,
          isActive: true,
          metadata: { type: "public", coverage: "outdoor" },
        },
        {
          name: "Emergency Services Building",
          location: "Emergency Services HQ",
          streamUrl: null,
          isActive: true,
          metadata: { type: "security", coverage: "building" },
        },
        {
          name: "Highway Overpass Cam 3",
          location: "Highway 101 - Exit 45",
          streamUrl: null,
          isActive: false,
          metadata: { type: "traffic", coverage: "highway" },
        },
      ];

      await db.insert(cameraFeeds).values(cameraFeedsData);
      console.log(`✅ Seeded ${cameraFeedsData.length} camera feeds`);

      // Initialize module health
      const modules = [
        {
          moduleName: "robocaller",
          status: "healthy",
          lastHeartbeat: new Date(),
          errorCount: 0,
          metrics: { uptime: "100%", callsProcessed: 0 },
        },
        {
          moduleName: "risk_analysis",
          status: "healthy",
          lastHeartbeat: new Date(),
          errorCount: 0,
          metrics: { uptime: "100%", assessmentsGenerated: 0 },
        },
        {
          moduleName: "camera_processing",
          status: "healthy",
          lastHeartbeat: new Date(),
          errorCount: 0,
          metrics: { uptime: "100%", detectionsProcessed: 0 },
        },
        {
          moduleName: "contact_management",
          status: "healthy",
          lastHeartbeat: new Date(),
          errorCount: 0,
          metrics: { uptime: "100%", activeContacts: contactsData.length },
        },
      ];

      await db.insert(moduleHealth).values(modules);
      console.log(`✅ Initialized ${modules.length} module health statuses`);

      console.log("\n🎉 Database seeding completed successfully!\n");
    } catch (error) {
      console.error("❌ Error seeding database:", error);
      throw error;
    }
  }

  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  