import { Router, Request, Response } from "express";
  import { db } from "../../db";
  import { riskAssessments, incidents } from "@shared/schema";
  import { eq, desc } from "drizzle-orm";

  const router = Router();

// Helper functions for rule-based risk assessment
function calculateRiskScore(incident: any): number {
  let score = 50;
  
  if (incident.severity === 'critical') score += 40;
  else if (incident.severity === 'high') score += 25;
  else if (incident.severity === 'medium') score += 10;
  else score -= 10;
  
  if (incident.status === 'active') score += 10;
  
  return Math.min(100, Math.max(0, score));
}

function determineThreatLevel(riskScore: number): string {
  if (riskScore >= 80) return 'severe';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 40) return 'moderate';
  return 'low';
}

function generateAnalysis(incident: any, riskScore: number): string {
  return `Risk assessment for ${incident.title}: ${incident.severity} severity incident with a calculated risk score of ${riskScore}. ${incident.description}`;
}

function generateRecommendations(incident: any): string[] {
  const recs = [];
  if (incident.severity === 'critical' || incident.severity === 'high') {
    recs.push('Immediate response required');
    recs.push('Alert emergency services');
    recs.push('Notify all relevant contacts');
  } else {
    recs.push('Monitor situation closely');
    recs.push('Prepare response team');
  }
  return recs;
}

function identifyRiskFactors(incident: any): string[] {
  const factors = [`Severity: ${incident.severity}`, `Status: ${incident.status}`];
  if (incident.location) factors.push(`Location: ${incident.location}`);
  return factors;
}

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
      const id = parseInt(req.params.incidentId as string);
      const assessment = await db
        .select()
        .from(riskAssessments)
        .where(eq(riskAssessments.incidentId, id))
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
      const incidentId = parseInt(req.params.incidentId as string);

      // Get incident details
      const [incident] = await db
        .select()
        .from(incidents)
        .where(eq(incidents.id, incidentId))
        .limit(1);

      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      // Calculate risk based on incident properties
      const riskScore = calculateRiskScore(incident);
      const threatLevel = determineThreatLevel(riskScore);
      const analysis = generateAnalysis(incident, riskScore);
      const recommendations = generateRecommendations(incident);
      const factors = identifyRiskFactors(incident);

      const aiAnalysis = {
        riskScore,
        threatLevel,
        analysis,
        recommendations,
        factors
      };

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

        // Create new assessment using rule-based logic
        try {
          const riskScore = calculateRiskScore(incident);
          const threatLevel = determineThreatLevel(riskScore);
          const analysis = generateAnalysis(incident, riskScore);
          const recommendations = generateRecommendations(incident);
          const factors = identifyRiskFactors(incident);

          const aiAnalysis = {
            riskScore,
            threatLevel,
            analysis,
            recommendations,
            factors
          };

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
  