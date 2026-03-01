# Risk Analysis Module - Developer Workspace 2

  ## 🎯 Module Purpose
  AI-driven threat assessment and risk scoring using GPT-5.2.

  ## 📁 Your Workspace
  ```
  server/modules/risk-analysis/
  ├── routes.ts          # Your API endpoints
  ├── controller.ts      # Add controllers here
  ├── service.ts         # Add business logic here
  └── README.md          # This file
  ```

  ## 🔌 API Endpoints

  ### GET /api/modules/risk-analysis
  List all risk assessments
  ```typescript
  Response: RiskAssessment[]
  ```

  ### GET /api/modules/risk-analysis/incident/:incidentId
  Get latest assessment for incident
  ```typescript
  Response: RiskAssessment | null
  ```

  ### POST /api/modules/risk-analysis/analyze/:incidentId
  Generate AI-powered risk analysis
  ```typescript
  Response: RiskAssessment
  ```

  ### POST /api/modules/risk-analysis/analyze-all
  Batch analyze all active incidents
  ```typescript
  Response: { message: string; assessments: RiskAssessment[] }
  ```

  ## 🤖 Using GPT-5.2

  ```typescript
  import { openai } from "../../replit_integrations/audio/client";

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "system",
        content: "You are an emergency response risk analyst..."
      },
      {
        role: "user",
        content: `Analyze this incident: ${incident.description}`
      }
    ],
    response_format: { type: "json_object" }
  });

  const analysis = JSON.parse(completion.choices[0].message.content);
  ```

  ## 💾 Database Access

  ```typescript
  import { db } from "../../db";
  import { riskAssessments, incidents } from "@shared/schema";
  import { eq } from "drizzle-orm";

  // Create assessment
  const [assessment] = await db.insert(riskAssessments).values({
    incidentId: 1,
    riskScore: 75,
    threatLevel: "high",
    analysis: "Detailed analysis...",
    recommendations: ["Action 1", "Action 2"],
    factors: { weather: "severe", population: "high" }
  }).returning();
  ```

  ## 📊 Risk Scoring Guidelines

  - **0-25:** Low risk - Monitor situation
  - **26-50:** Moderate risk - Prepare resources
  - **51-75:** High risk - Deploy response teams
  - **76-100:** Severe risk - Full emergency response

  ## 🎯 Threat Levels

  - **low:** Minimal impact, routine monitoring
  - **moderate:** Potential escalation, increased vigilance
  - **high:** Significant threat, active response needed
  - **severe:** Critical situation, maximum resource deployment

  ## 📡 Broadcasting Updates

  ```typescript
  import { broadcast } from "../../index";

  broadcast("risk_assessment_created", { assessment });
  ```

  ## 🚀 Development Tips

  1. **Cache assessments** - Avoid re-analyzing within short timeframes
  2. **Structure AI responses** - Use JSON mode for consistent output
  3. **Factor analysis** - Consider weather, location, time, population density
  4. **Recommendation quality** - Provide actionable, specific suggestions
  5. **Continuous learning** - Track which assessments were accurate

  ## 📋 Schema Reference

  ```typescript
  type RiskAssessment = {
    id: number;
    incidentId: number;
    riskScore: number; // 0-100
    threatLevel: "low" | "moderate" | "high" | "severe";
    analysis: string;
    recommendations?: string[];
    factors?: any;
    createdAt: Date;
  }
  ```
  