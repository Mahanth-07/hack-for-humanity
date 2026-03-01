import { sql } from "drizzle-orm";
  import { pgTable, text, varchar, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
  import { createInsertSchema, createSelectSchema } from "drizzle-zod";
  import { z } from "zod";

  // Users table
  export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
  });

  export const insertUserSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
  });

  export type InsertUser = z.infer<typeof insertUserSchema>;
  export type User = typeof users.$inferSelect;

  // Emergency Incidents table
  export const incidents = pgTable("incidents", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    severity: text("severity").notNull(), // low, medium, high, critical
    status: text("status").notNull().default("active"), // active, resolved, escalated
    location: text("location"),
    coordinates: jsonb("coordinates"), // {lat: number, lng: number}
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  });

  export const insertIncidentSchema = createInsertSchema(incidents).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

  export type Incident = typeof incidents.$inferSelect;
  export type InsertIncident = z.infer<typeof insertIncidentSchema>;

  // Emergency Contacts table
  export const contacts = pgTable("contacts", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    role: text("role").notNull(), // first_responder, medical, fire, police, coordinator
    priority: integer("priority").notNull().default(1), // 1-5, 1 being highest
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata"), // additional contact info
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  export const insertContactSchema = createInsertSchema(contacts).omit({
    id: true,
    createdAt: true,
  });

  export type Contact = typeof contacts.$inferSelect;
  export type InsertContact = z.infer<typeof insertContactSchema>;

  // Robocalls table
  export const robocalls = pgTable("robocalls", {
    id: serial("id").primaryKey(),
    incidentId: integer("incident_id").references(() => incidents.id),
    contactId: integer("contact_id").references(() => contacts.id).notNull(),
    status: text("status").notNull(), // pending, calling, completed, failed
    message: text("message").notNull(),
    audioUrl: text("audio_url"),
    attempts: integer("attempts").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  export const insertRobocallSchema = createInsertSchema(robocalls).omit({
    id: true,
    createdAt: true,
  });

  export type Robocall = typeof robocalls.$inferSelect;
  export type InsertRobocall = z.infer<typeof insertRobocallSchema>;

  // Risk Assessments table
export const riskAssessments = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").references(() => incidents.id).notNull(),
  riskScore: integer("risk_score").notNull(), // 0-100
  severity: text("severity"), // low, medium, high, severe
  threatLevel: text("threat_level").notNull(), // low, moderate, high, severe
  priorityScore: integer("priority_score"), // bounded ranking score
  analysis: text("analysis").notNull(),
  recommendations: jsonb("recommendations"), // array of recommended actions
  factors: jsonb("factors"), // contributing risk factors
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

  export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments).omit({
    id: true,
    createdAt: true,
  });

  export type RiskAssessment = typeof riskAssessments.$inferSelect;
  export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;

  // Camera Feeds table
  export const cameraFeeds = pgTable("camera_feeds", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    location: text("location").notNull(),
    streamUrl: text("stream_url"),
    videoUrl: text("video_url"),
    status: text("status").notNull().default("idle"),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  export const insertCameraFeedSchema = createInsertSchema(cameraFeeds).omit({
    id: true,
    createdAt: true,
  });

  export type CameraFeed = typeof cameraFeeds.$inferSelect;
  export type InsertCameraFeed = z.infer<typeof insertCameraFeedSchema>;

  // Camera Detections table
  export const cameraDetections = pgTable("camera_detections", {
    id: serial("id").primaryKey(),
    cameraFeedId: integer("camera_feed_id").references(() => cameraFeeds.id).notNull(),
    incidentId: integer("incident_id").references(() => incidents.id),
    detectionType: text("detection_type").notNull(), // fire, person, vehicle, anomaly
    confidence: integer("confidence").notNull(), // 0-100
    imageUrl: text("image_url"),
    boundingBox: jsonb("bounding_box"), // {x, y, width, height}
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  export const insertCameraDetectionSchema = createInsertSchema(cameraDetections).omit({
    id: true,
    createdAt: true,
  });

  export type CameraDetection = typeof cameraDetections.$inferSelect;
  export type InsertCameraDetection = z.infer<typeof insertCameraDetectionSchema>;

  // Module Health Status table
  export const moduleHealth = pgTable("module_health", {
    id: serial("id").primaryKey(),
    moduleName: text("module_name").notNull().unique(), // robocaller, risk_analysis, camera_processing, contact_management
    status: text("status").notNull(), // healthy, degraded, down
    lastHeartbeat: timestamp("last_heartbeat").defaultNow().notNull(),
    metrics: jsonb("metrics"), // {cpu, memory, uptime, etc}
    errorCount: integer("error_count").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  });

  export const insertModuleHealthSchema = createInsertSchema(moduleHealth).omit({
    id: true,
    updatedAt: true,
  });

  export type ModuleHealth = typeof moduleHealth.$inferSelect;
  export type InsertModuleHealth = z.infer<typeof insertModuleHealthSchema>;
  
