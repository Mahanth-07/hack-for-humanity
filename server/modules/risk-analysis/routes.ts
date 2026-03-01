import { Router, Request, Response } from "express";
  import { db } from "../../db";
  import { riskAssessments, incidents } from "@shared/schema";
  import { eq, desc } from "drizzle-orm";
  import { openai } from "../../replit_integrations/audio/client";

  const router = Router();

  // Get all risk assessments
  router.get("/", async (req: Request, res: Response) => {
    try {
      const assessments = await db
        .select()
        .from(riskAssessments)
        .orderBy(desc(riskAssessments.createdAt));
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching risk assessments:", error);
      res.status(500).json({ error: "Failed to fetch risk assessments" });
    }
  });

  // Get risk assessment for specific incident
  router.get("/incident/:incidentId", async (req: Request, res: Response) => {
    try {
      const incidentId = parseInt(req.params.incidentId);
      const assessment = await db
        .select()
        .from(riskAssessments)
        .where(eq(riskAssessments.incidentId, incidentId))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(1);

      res.json(assessment[0] || null);
    } catch (error) {
      console.error("Error fetching risk assessment:", error);
      res.status(500).json({ error: "Failed to fetch risk assessment" });
    }
  });

  // Create AI-powered risk assessment
  router.post("/analyze/:incidentId", async (req: Request, res: Response) => {
    try {
      const incidentId = parseInt(req.params.incidentId);

      // Get incident details
      const [incident] = await db
        .select()
        .from(incidents)
        .where(eq(incidents.id, incidentId))
        .limit(1);

      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      // Use AI to analyze risk
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: "You are an emergency response risk analyst. Analyze the incident and provide a risk score (0-100), threat level (low/moderate/high/severe), detailed analysis, and specific recommendations. Respond in JSON format with keys: riskScore, threatLevel, analysis, recommendations (array), factors (array)."
          },
          {
            role: "user",
            content: `Analyze this emergency incident:\n\nTitle: ${incident.title}\nDescription: ${incident.description}\nSeverity: ${incident.severity}\nLocation: ${incident.location || "Unknown"}\n\nProvide comprehensive risk assessment.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const aiAnalysis = JSON.parse(completion.choices[0].message.content || "{}");

      // Store risk assessment
      const [assessment] = await db
        .insert(riskAssessments)
        .values({
          incidentId,
          riskScore: aiAnalysis.riskScore || 50,
          threatLevel: aiAnalysis.threatLevel || "moderate",
          analysis: aiAnalysis.analysis || "Analysis pending",
          recommendations: aiAnalysis.recommendations || [],
          factors: aiAnalysis.factors || [],
        })
        .returning();

      res.json(assessment);
    } catch (error) {
      console.error("Error creating risk assessment:", error);
      res.status(500).json({ error: "Failed to create risk assessment" });
    }
  });

  // Batch analyze all active incidents
  router.post("/analyze-all", async (req: Request, res: Response) => {
    try {
      const activeIncidents = await db
        .select()
        .from(incidents)
        .where(eq(incidents.status, "active"));

      const assessments = [];
      for (const incident of activeIncidents) {
        // Check if recent assessment exists
        const existing = await db
          .select()
          .from(riskAssessments)
          .where(eq(riskAssessments.incidentId, incident.id))
          .orderBy(desc(riskAssessments.createdAt))
          .limit(1);

        // Skip if assessed in last hour
        if (existing.length > 0) {
          const lastAssessment = existing[0];
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (lastAssessment.createdAt > hourAgo) {
            assessments.push(lastAssessment);
            continue;
          }
        }

        // Create new assessment using AI
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
              {
                role: "system",
                content: "You are an emergency response risk analyst. Analyze incidents and provide risk scores, threat levels, and recommendations in JSON format."
              },
              {
                role: "user",
                content: `Analyze: ${incident.title}. ${incident.description}. Severity: ${incident.severity}.`
              }
            ],
            response_format: { type: "json_object" }
          });

          const aiAnalysis = JSON.parse(completion.choices[0].message.content || "{}");

          const [assessment] = await db
            .insert(riskAssessments)
            .values({
              incidentId: incident.id,
              riskScore: aiAnalysis.riskScore || 50,
              threatLevel: aiAnalysis.threatLevel || "moderate",
              analysis: aiAnalysis.analysis || "Analysis pending",
              recommendations: aiAnalysis.recommendations || [],
              factors: aiAnalysis.factors || [],
            })
            .returning();

          assessments.push(assessment);
        } catch (error) {
          console.error(`Error analyzing incident ${incident.id}:`, error);
        }
      }

      res.json({ 
        message: `Analyzed ${assessments.length} incidents`,
        assessments 
      });
    } catch (error) {
      console.error("Error batch analyzing:", error);
      res.status(500).json({ error: "Failed to batch analyze incidents" });
    }
  });

  export default router;
  