import { db } from "../db";
  import { contacts, cameraFeeds, moduleHealth, incidents } from "@shared/schema";

  async function seed() {
    console.log("Seeding database...");

    try {
      const contactsData = [
        { name: "FDNY - Station 1", phone: "+1-212-555-0101", email: "station1@fdny.gov", role: "fire", priority: 1, isActive: true },
        { name: "NYPD - Central", phone: "+1-212-555-0102", email: "central@nypd.gov", role: "police", priority: 1, isActive: true },
        { name: "LAFD - Station 9", phone: "+1-323-555-0103", email: "station9@lafd.gov", role: "fire", priority: 1, isActive: true },
        { name: "Chicago EMS", phone: "+1-312-555-0104", email: "dispatch@chicagoems.gov", role: "medical", priority: 1, isActive: true },
        { name: "Houston PD - District 1", phone: "+1-713-555-0105", email: "d1@houstonpd.gov", role: "police", priority: 1, isActive: true },
        { name: "Miami-Dade Fire Rescue", phone: "+1-305-555-0106", email: "rescue@miamidade.gov", role: "fire", priority: 2, isActive: true },
        { name: "Seattle Emergency Coordinator", phone: "+1-206-555-0107", email: "coord@seattle.gov", role: "coordinator", priority: 1, isActive: true },
        { name: "Denver First Responders", phone: "+1-303-555-0108", email: "team@denverfr.gov", role: "first_responder", priority: 2, isActive: true },
      ];

      await db.insert(contacts).values(contactsData);
      console.log(`Seeded ${contactsData.length} contacts`);

      const cameraFeedsData = [
        { name: "Times Square Cam", location: "Times Square, New York, NY", coordinates: { lat: 40.758, lng: -73.9855 }, isActive: true, metadata: { type: "public", coverage: "outdoor", state: "NY" } },
        { name: "Brooklyn Bridge Cam", location: "Brooklyn Bridge, New York, NY", coordinates: { lat: 40.7061, lng: -73.9969 }, isActive: true, metadata: { type: "infrastructure", coverage: "bridge", state: "NY" } },
        { name: "Hollywood Blvd Cam", location: "Hollywood Blvd, Los Angeles, CA", coordinates: { lat: 34.1016, lng: -118.3267 }, isActive: true, metadata: { type: "public", coverage: "outdoor", state: "CA" } },
        { name: "LAX Terminal 1", location: "LAX Airport, Los Angeles, CA", coordinates: { lat: 33.9425, lng: -118.408 }, isActive: true, metadata: { type: "security", coverage: "building", state: "CA" } },
        { name: "Michigan Ave Cam", location: "Michigan Avenue, Chicago, IL", coordinates: { lat: 41.8827, lng: -87.6233 }, isActive: true, metadata: { type: "traffic", coverage: "street", state: "IL" } },
        { name: "Navy Pier Cam", location: "Navy Pier, Chicago, IL", coordinates: { lat: 41.8917, lng: -87.6086 }, isActive: true, metadata: { type: "public", coverage: "outdoor", state: "IL" } },
        { name: "Space Needle Cam", location: "Space Needle, Seattle, WA", coordinates: { lat: 47.6205, lng: -122.3493 }, isActive: true, metadata: { type: "public", coverage: "landmark", state: "WA" } },
        { name: "I-10 Houston Cam", location: "I-10 & I-45 Interchange, Houston, TX", coordinates: { lat: 29.7604, lng: -95.3698 }, isActive: true, metadata: { type: "traffic", coverage: "highway", state: "TX" } },
        { name: "6th Street Cam", location: "6th Street, Austin, TX", coordinates: { lat: 30.2672, lng: -97.7431 }, isActive: true, metadata: { type: "public", coverage: "outdoor", state: "TX" } },
        { name: "South Beach Cam", location: "Ocean Drive, Miami Beach, FL", coordinates: { lat: 25.7826, lng: -80.1341 }, isActive: true, metadata: { type: "public", coverage: "outdoor", state: "FL" } },
        { name: "Port of Miami Cam", location: "Port of Miami, FL", coordinates: { lat: 25.7743, lng: -80.1709 }, isActive: true, metadata: { type: "security", coverage: "port", state: "FL" } },
        { name: "Coors Field Cam", location: "Coors Field, Denver, CO", coordinates: { lat: 39.7559, lng: -104.9942 }, isActive: true, metadata: { type: "public", coverage: "stadium", state: "CO" } },
        { name: "Peachtree St Cam", location: "Peachtree Street, Atlanta, GA", coordinates: { lat: 33.749, lng: -84.388 }, isActive: true, metadata: { type: "traffic", coverage: "street", state: "GA" } },
        { name: "Fenway Park Cam", location: "Fenway Park, Boston, MA", coordinates: { lat: 42.3467, lng: -71.0972 }, isActive: true, metadata: { type: "security", coverage: "stadium", state: "MA" } },
        { name: "Liberty Bell Cam", location: "Independence Mall, Philadelphia, PA", coordinates: { lat: 39.9496, lng: -75.1503 }, isActive: true, metadata: { type: "public", coverage: "landmark", state: "PA" } },
        { name: "Strip District Cam", location: "Las Vegas Strip, Las Vegas, NV", coordinates: { lat: 36.1147, lng: -115.1728 }, isActive: true, metadata: { type: "public", coverage: "outdoor", state: "NV" } },
        { name: "Gateway Arch Cam", location: "Gateway Arch, St. Louis, MO", coordinates: { lat: 38.6247, lng: -90.1848 }, isActive: true, metadata: { type: "public", coverage: "landmark", state: "MO" } },
        { name: "Pike Place Cam", location: "Pike Place Market, Seattle, WA", coordinates: { lat: 47.6097, lng: -122.3425 }, isActive: true, metadata: { type: "public", coverage: "market", state: "WA" } },
        { name: "French Quarter Cam", location: "Bourbon Street, New Orleans, LA", coordinates: { lat: 29.9584, lng: -90.0644 }, isActive: true, metadata: { type: "public", coverage: "outdoor", state: "LA" } },
        { name: "National Mall Cam", location: "National Mall, Washington, DC", coordinates: { lat: 38.8899, lng: -77.0091 }, isActive: true, metadata: { type: "security", coverage: "landmark", state: "DC" } },
      ];

      await db.insert(cameraFeeds).values(cameraFeedsData);
      console.log(`Seeded ${cameraFeedsData.length} camera feeds`);

      const incidentsData = [
        { title: "Structure Fire - Warehouse District", description: "Multi-alarm fire reported at industrial warehouse.", severity: "critical", status: "active", location: "Warehouse District, Los Angeles, CA", coordinates: { lat: 34.0407, lng: -118.2468 } },
        { title: "Multi-Vehicle Collision - I-10", description: "5-car pileup on I-10 westbound.", severity: "high", status: "active", location: "I-10 Westbound, Houston, TX", coordinates: { lat: 29.749, lng: -95.358 } },
        { title: "Suspicious Package - Times Square", description: "Unattended package reported near subway entrance.", severity: "high", status: "active", location: "Times Square Station, New York, NY", coordinates: { lat: 40.756, lng: -73.987 } },
        { title: "Flooding - Lower Wacker Drive", description: "Flash flooding reported. Road impassable.", severity: "medium", status: "active", location: "Lower Wacker Drive, Chicago, IL", coordinates: { lat: 41.887, lng: -87.627 } },
        { title: "Power Outage - South Beach", description: "Major power outage affecting 10 blocks.", severity: "medium", status: "active", location: "South Beach, Miami, FL", coordinates: { lat: 25.783, lng: -80.131 } },
        { title: "Gas Leak - Capitol Hill", description: "Natural gas leak. Evacuation in progress.", severity: "high", status: "active", location: "Capitol Hill, Seattle, WA", coordinates: { lat: 47.625, lng: -122.322 } },
        { title: "Missing Person - Centennial Park", description: "Missing child reported near park.", severity: "medium", status: "active", location: "Centennial Park, Atlanta, GA", coordinates: { lat: 33.7604, lng: -84.3931 } },
        { title: "Chemical Spill - Port Area", description: "Chemical spill at port. Hazmat dispatched.", severity: "critical", status: "active", location: "Port of New Orleans, LA", coordinates: { lat: 29.935, lng: -90.063 } },
        { title: "Traffic Signal Failure", description: "Multiple signals malfunctioning.", severity: "low", status: "active", location: "Peachtree & 14th, Atlanta, GA", coordinates: { lat: 33.786, lng: -84.383 } },
        { title: "Medical Emergency - Convention Center", description: "Mass casualty incident reported.", severity: "critical", status: "active", location: "Las Vegas Convention Center, NV", coordinates: { lat: 36.128, lng: -115.153 } },
      ];

      await db.insert(incidents).values(incidentsData);
      console.log(`Seeded ${incidentsData.length} incidents`);

      const modules = [
        { moduleName: "robocaller", status: "healthy", lastHeartbeat: new Date(), errorCount: 0, metrics: { uptime: "100%", callsProcessed: 0 } },
        { moduleName: "risk_analysis", status: "healthy", lastHeartbeat: new Date(), errorCount: 0, metrics: { uptime: "100%", assessmentsGenerated: 0 } },
        { moduleName: "camera_processing", status: "healthy", lastHeartbeat: new Date(), errorCount: 0, metrics: { uptime: "100%", detectionsProcessed: 0 } },
        { moduleName: "contact_management", status: "healthy", lastHeartbeat: new Date(), errorCount: 0, metrics: { uptime: "100%", activeContacts: contactsData.length } },
      ];

      await db.insert(moduleHealth).values(modules);
      console.log(`Initialized ${modules.length} module health statuses`);

      console.log("\nDatabase seeding completed!\n");
    } catch (error) {
      console.error("Error seeding database:", error);
      throw error;
    }
  }

  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
