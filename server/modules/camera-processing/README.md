# Camera Processing Module - Developer Workspace 3

  ## 🎯 Module Purpose
  Real-time video analysis and threat detection using GPT-5.2 vision capabilities.

  ## 📁 Your Workspace
  ```
  server/modules/camera-processing/
  ├── routes.ts          # Your API endpoints
  ├── controller.ts      # Add controllers here
  ├── service.ts         # Add business logic here
  └── README.md          # This file
  ```

  ## 🔌 API Endpoints

  ### Camera Feeds
  - **GET /api/modules/camera-processing/feeds** - List all camera feeds
  - **POST /api/modules/camera-processing/feeds** - Create camera feed
  - **PATCH /api/modules/camera-processing/feeds/:id/toggle** - Toggle feed status

  ### Detections
  - **GET /api/modules/camera-processing/detections** - List all detections (limit 100)
  - **GET /api/modules/camera-processing/detections/camera/:cameraId** - Detections for camera
  - **POST /api/modules/camera-processing/detect** - Process image with AI
  - **POST /api/modules/camera-processing/simulate/:cameraId** - Simulate detection (testing)

  ## 🤖 Using GPT-5.2 Vision

  ```typescript
  import { openai } from "../../replit_integrations/audio/client";

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: "Analyze this camera image for emergencies..."
        },
        {
          type: "image_url",
          image_url: {
            url: imageUrl // or data:image/jpeg;base64,...
          }
        }
      ]
    }],
    response_format: { type: "json_object" }
  });

  const detection = JSON.parse(completion.choices[0].message.content);
  ```

  ## 🎥 Processing Images

  ```typescript
  // From URL
  POST /api/modules/camera-processing/detect
  {
    cameraFeedId: 1,
    imageUrl: "https://example.com/image.jpg"
  }

  // From base64 data
  POST /api/modules/camera-processing/detect
  {
    cameraFeedId: 1,
    imageData: "base64-encoded-image-data"
  }
  ```

  ## 🚨 Auto-Incident Creation

  When detection urgency is "critical" or "high", an incident is automatically created:

  ```typescript
  if (aiDetection.urgency === "critical" || aiDetection.urgency === "high") {
    const [incident] = await db.insert(incidents).values({
      title: `Camera Detection: ${aiDetection.detectionType}`,
      description: aiDetection.description,
      severity: aiDetection.urgency === "critical" ? "critical" : "high",
      status: "active",
      location: camera.location,
    }).returning();
  }
  ```

  ## 💾 Database Access

  ```typescript
  import { db } from "../../db";
  import { cameraFeeds, cameraDetections, incidents } from "@shared/schema";

  // Create camera feed
  const [feed] = await db.insert(cameraFeeds).values({
    name: "Downtown Camera 1",
    location: "Main St & 1st Ave",
    isActive: true,
  }).returning();

  // Store detection
  const [detection] = await db.insert(cameraDetections).values({
    cameraFeedId: feed.id,
    detectionType: "fire",
    confidence: 92,
    metadata: { description: "Smoke detected" }
  }).returning();
  ```

  ## 🎯 Detection Types

  - **fire** - Fire or smoke detected
  - **person** - Person in restricted area
  - **vehicle** - Unauthorized vehicle
  - **anomaly** - Unusual activity or object

  ## 📊 Confidence Scoring

  - **90-100:** Very high confidence - Immediate action
  - **75-89:** High confidence - Investigate
  - **60-74:** Moderate confidence - Monitor
  - **Below 60:** Low confidence - Review manually

  ## 📡 Broadcasting Updates

  ```typescript
  import { broadcast } from "../../index";

  broadcast("detection_created", { detection });
  broadcast("camera_status_changed", { cameraFeed });
  ```

  ## 🚀 Development Tips

  1. **Image preprocessing** - Resize large images before sending to AI
  2. **Confidence thresholds** - Only store high-confidence detections
  3. **Rate limiting** - Avoid analyzing same camera too frequently
  4. **Bounding boxes** - Store detection coordinates for visualization
  5. **Historical analysis** - Track patterns over time

  ## 📋 Schema Reference

  ```typescript
  type CameraFeed = {
    id: number;
    name: string;
    location: string;
    streamUrl?: string;
    isActive: boolean;
    metadata?: any;
    createdAt: Date;
  }

  type CameraDetection = {
    id: number;
    cameraFeedId: number;
    incidentId?: number;
    detectionType: "fire" | "person" | "vehicle" | "anomaly";
    confidence: number; // 0-100
    imageUrl?: string;
    boundingBox?: { x: number, y: number, width: number, height: number };
    metadata?: any;
    createdAt: Date;
  }
  ```
  