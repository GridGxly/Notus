# NOTUS

**Named after the Greek god of the south wind. Four AI agents coordinate in real-time to deliver personalized hurricane evacuation plans. Enter a ZIP code, get a plan.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/GridGxly/Notus/blob/main/LICENSE)
[![Deploy](https://img.shields.io/badge/Live-Cloud%20Run-4285F4?logo=google-cloud)](https://notus-157773981093.us-central1.run.app/)
[![Built with](https://img.shields.io/badge/Built%20with-Google%20ADK-FF6B35)](https://google.github.io/adk-docs/)

## Inspiration

Every Floridian has a hurricane story. During Milton, families spent hours trying to find gas, figure out which shelters were open, and decide when to leave. The information existed, scattered across a dozen websites, all crashing under load. NOTUS replaces that chaos with a single command center: enter your location, and four AI agents do the rest.

## What it does

NOTUS is a multi-agent hurricane intelligence system. You enter a Florida ZIP code or tap "LOCATE ME", and four specialized AI agents deploy simultaneously:

- **Recon** pulls live weather data from the National Weather Service, assesses threat levels, and flags conflicting signals
- **Supply** searches Google Places for open gas stations, grocery stores, and pharmacies within 5km
- **Shelter** locates community centers, schools, and churches within 10km that could serve as emergency shelters
- **Dispatch** coordinates all three agents, resolves conflicts between their recommendations, and synthesizes everything into one clear action plan

The result: a threat level, your nearest fuel, your nearest shelter, and a directive like "Fill up by 4 PM. If conditions worsen, evacuate north on I-275.

## How it works

```
User enters ZIP / taps LOCATE ME
         |
         v
   +--------------+
   |   Dispatch    |  -- Root coordinator (Gemini 2.5 Flash)
   |   Agent       |
   +------+-------+
          |
    +-----+-------------+
    v     v              v
+-------+ +-------+ +---------+
| Recon | |Supply | | Shelter |    <-- Sub-agents run in parallel
|       | |       | |         |
| NWS   | |Places | | Places  |    <-- Each has specialized tools
| API   | | API   | | API     |
+-------+ +-------+ +---------+
    |         |          |
    +---------+----------+
              v
     +----------------+
     |  Action Plan   |  -- Threat level, fuel, shelter, directive
     |  + Map Pins    |  -- Locations plotted on dark-mode map
     |  + Follow-up   |  -- Ask questions, get answers in context
     +----------------+
```

### The Agent Conversation

Agents don't just return data. They talk to each other like an operations team on a radio channel:

> **Recon:** "Dispatch, weather assessment for Tampa Bay is ready. Current conditions show partly cloudy skies with temperatures at 66 degrees. Winds northeast at 10-18 mph. No active hurricane warnings..."
>
> **Supply:** "Team, I found 4 open stations near the target. Wawa on S Hiawassee is confirmed open..."
>
> **Shelter:** "Dispatch, I've located 3 potential shelters. MetroWest Golf Club community center is 0.4 miles out..."
>
> **Dispatch:** "All agents reported in. Threat level 1/5, clear. Your nearest fuel is Wawa, 0.3 miles east, currently open. Directive: no immediate action needed, but stay weather-aware."

### Conflict Resolution

If Recon reports a storm approaching from the south but Supply recommends a gas station to the south, Dispatch catches the conflict and overrides, recommending resources in the opposite direction of the storm. This reasoning is visible in the agent trace.

## Tech Stack

| Layer               | Technology                                             | Purpose                                                       |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| **Agent Framework** | Google ADK (@google/adk)                               | Multi-agent orchestration with LlmAgent, sub-agent delegation |
| **LLM**             | Gemini 2.5 Flash                                       | Powers all 4 agents with fast inference                       |
| **Frontend**        | Next.js 16 + React 19 + Tailwind CSS 4                 | Fullscreen map UI with floating glass panels                  |
| **Maps**            | Google Maps JavaScript API + @vis.gl/react-google-maps | Dark-mode interactive map with animated markers               |
| **Weather Data**    | NWS API (api.weather.gov)                              | Real-time alerts and forecasts, free, no auth                 |
| **Places Data**     | Google Places API (New)                                | Gas stations, shelters, open/closed status                    |
| **Validation**      | Zod v4                                                 | Schema validation for all tool parameters                     |
| **Streaming**       | Server-Sent Events (SSE)                               | Real-time agent status updates to the frontend                |
| **Deployment**      | Google Cloud Run + Cloud Build                         | Containerized, auto-scaling, live URL                         |
| **Language**        | TypeScript 5                                           | End-to-end type safety                                        |

## Features

### Real-Time Agent Visualization

Watch agents think in real-time. Each agent shows its current status with animated indicators, thinking messages cycle as work progresses, and feed items slide in as agents report findings.

### Interactive Dark-Mode Map

Fullscreen dark map with the sidebar and action bar floating as glassmorphic panels. Supply pins glow amber, shelter pins glow purple, and your location pulses green. Click any pin for details and a "Get Directions" link.

### Follow-Up Chat

After the plan generates, ask follow-up questions: "What about my pets?", "Are there hospitals nearby?", "What if I-275 is flooded?" Dispatch answers using context from the original analysis.

### Geolocation

Tap "LOCATE ME" and the browser's Geolocation API pinpoints your exact position. No ZIP code needed.

### Progressive Pin Drops

Pins don't dump all at once. They appear incrementally as each agent reports, with spring animations and the map camera adjusting to fit.

## Architecture

```
notus/
├── src/app/
|   ├── agents/
|   |   ├── dispatch.ts          # Root coordinator, sub-agent delegation
|   |   ├── recon.ts             # Weather threat assessment
|   |   ├── supply.ts            # Fuel/grocery/pharmacy finder
|   |   ├── shelter.ts           # Emergency shelter locator
|   |   └── tools/
|   |       ├── nws.ts           # NWS alerts + forecast tools
|   |       ├── places.ts        # Google Places nearby search
|   |       └── shelters.ts      # Shelter-specific Places search
|   ├── api/agents/
|   |   └── route.ts             # SSE streaming endpoint
|   ├── components/
|   |   ├── Dashboard.tsx        # Main state manager, SSE consumer
|   |   ├── Sidebar.tsx          # ZIP input, agent rows, activity feed
|   |   ├── MapView.tsx          # Google Maps with custom markers
|   |   ├── ActionBar.tsx        # Glassmorphic action plan cards
|   |   ├── AgentRow.tsx         # Agent status with shimmer/checkmark
|   |   └── ActivityFeed.tsx     # Scrollable agent message feed
|   └── lib/
|       └── types.ts             # Shared TypeScript interfaces
├── Dockerfile                   # Multi-stage build for Cloud Run
├── cloudbuild.yaml              # Cloud Build CI/CD config
└── next.config.ts               # Standalone output for containers
```

## Getting Started

### Prerequisites

- Node.js 20+
- Google Cloud project with Maps JavaScript API, Places API (New), and Geocoding API enabled
- Gemini API key from [AI Studio](https://aistudio.google.com)

### Installation

```bash
git clone https://github.com/GridGxly/Notus.git
cd Notus
npm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

Fill in your keys:

```
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_API_KEY=your_google_maps_platform_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_platform_key
NWS_USER_AGENT=(notus-hackusf, your@email.com)
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Cloud Run

```bash
# Build
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions="_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key" \
  --region=us-central1 .

# Deploy
gcloud run deploy notus \
  --image gcr.io/YOUR_PROJECT/notus:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --set-env-vars "GOOGLE_API_KEY=your_key,GEMINI_API_KEY=your_key"
```

## Challenges

- **ADK is brand new.** The Google Agent Development Kit had minimal documentation and examples when I started. Figuring out FunctionTool schemas, InMemoryRunner event streams, and sub-agent delegation required reading source code directly.
- **SSE streaming from agents.** Getting real-time updates from the ADK runner to the frontend via Server-Sent Events required custom event processing, author detection, and careful JSON extraction from model responses.
- **Places API 403 errors.** Debugging which API key had access to which Google API across AI Studio keys vs Cloud Console keys took longer than implementing the actual features.
- **Map dark mode.** Google Maps' `mapId` prop conflicts with custom `styles`. AdvancedMarker requires a mapId. Solved by building custom HtmlMarker components using OverlayView.

## What I Learned

- Multi-agent orchestration with Google ADK and how sub-agent delegation actually works under the hood
- Server-Sent Events for streaming AI responses to a React frontend
- Google Cloud Run deployment with Cloud Build CI/CD pipelines
- The Google Places API (New) and NWS Weather API

## What's Next

- Real-time shelter capacity data from county emergency management APIs
- Traffic-aware routing that factors in evacuation congestion
- Push notifications when threat levels change
- Multi-state support beyond Florida
- Voice briefings using text-to-speech for hands-free operation

## Acknowledgments

- [Google ADK](https://google.github.io/adk-docs/) for the agent framework
- [National Weather Service API](https://www.weather.gov/documentation/services-web-api) for free, real-time weather data
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service) for location intelligence

---

**Built at HackUSF 2026. Named after the Greek god of the south wind. Four agents. One mission. Get home safe.**
