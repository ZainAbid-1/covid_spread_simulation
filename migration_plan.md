# Master Specification: "The Invisible Cloud" - Measles Simulation Refactor

**Version:** 2.0 (Distinguished Architecture)
**Target Stack:** Python (FastAPI/NetworkX) + React (Vite/Canvas)
**Objective:** Refactor the existing COVID-19 contact simulation into a high-performance **Measles (Airborne Persistence)** simulation. This moves from a standard graph model to a **Spatially-Aware Environmental Model** with a professional Command Center UI.

---

## 📂 1. File Structure & Architecture

```text
/backend
  ├── app.py                # UPDATE: Add /ws/simulate-measles endpoint
  ├── config.py             # UPDATE: Add Measles params (Decay, Shedding)
  ├── data_loader.py        # REFACTOR: Implement "Archipelago" Layout (Islands)
  ├── measles_model.py      # NEW: Physics engine for Environmental Memory
  ├── sir_model.py          # (Legacy/Keep for reference)
/frontend
  ├── src/
      ├── components/
          ├── ControlPanel.jsx    # REFACTOR: Setup Screen Logic
          ├── CustomTownMap.jsx   # REFACTOR: Canvas Heatmap Rendering
          ├── NetworkGraph.jsx    # REFACTOR: Transmission Vector Lines
          ├── Statistics.jsx      # REFACTOR: Air Quality Charts
          ├── Timeline.jsx        # REFACTOR: Rich Event Logs
      ├── App.jsx                 # REFACTOR: Split-Screen Grid Layout
🏗️ 2. Backend Implementation Specification
2.1 Dependencies (requirements.txt)
Add the following to support clustering and vector math:
code
Text
python-louvain>=0.16
scikit-learn>=1.0
numpy>=1.21
2.2 Refactor data_loader.py (The "Archipelago" Map Generator)
Goal: Transform the "Blob" graph into a map with distinct "Districts" (Islands).
Logic:
Community Detection: Inside load_data(), run community_louvain.best_partition(G) immediately after graph creation.
State: Store self.communities (Dict: NodeID -> CommunityID).
Anchor Point Generation:
Calculate 
N
N
 communities.
Generate 
N
N
 (X, Y) coordinates arranged in a large Circle (Radius ~2500) or Grid. These are the "District Centers".
Constrained Layout:
Init: Place every node at its District Center + random noise (+/- 200px).
Spring Layout: Run nx.spring_layout with pos initialized.
CRITICAL: Set a high k (repulsion) value (e.g., k=2.0) so districts stay separated by empty space ("streets").
Export: Ensure get_graph_structure API returns the community_id for every node.
2.3 Create measles_model.py (The Physics Engine)
Goal: Implement the "Environmental Memory" logic.
Class MeaslesSimulation:
State:
self.zone_map: Dict [CommunityID, Float] (The Invisible Cloud).
self.node_states: Dict [NodeID, Int] (0:S, 1:E, 2:I, 3:R).
Generator Logic (step()):
Physics (Ventilation):
Apply Decay: zone_map[z] *= (1.0 - params.ventilation_rate).
Physics (Shedding):
For every active_infected_node: Find their zone -> zone_map[z] += params.shedding_rate.
Infection (Dual Vector):
Iterate Susceptible nodes.
Vector A (Direct): Check contacts_df. If touching Infected -> infect(method="contact").
Vector B (Airborne): Check zone_map[node.zone].
Calculate Prob: P = 1 - exp(-beta_air * zone_load).
If Hit -> infect(method="airborne", source_zone=node.zone).
Yield JSON Payload:
code
JSON
{
  "time": 12345,
  "new_infections": [
    {"id": 1, "method": "contact", "source": 5},
    {"id": 2, "method": "airborne", "zone": 3}
  ],
  "zone_updates": {"3": 500.25, "1": 0.0},
  "stats": {"avg_aqi": 120.5}
}
2.4 Update app.py
Add /ws/simulate-measles.
Accept ventilation_rate (0.0 to 0.5) in the initial WebSocket handshake.
🎨 3. Frontend UI & Layout Specification
3.1 App.jsx (The Split-Screen Dashboard)
Goal: A professional "Command Center" workflow.
State: viewMode ('setup' | 'running').
View A: The Setup Screen
Design: A centered, glass-morphism card.
Controls:
Transmission Rate (
β
β
)
Ventilation Efficiency (New): Slider (0-100%).
Initial Infections.
Action: "INITIATE SIMULATION" button -> Switches view to 'running'.
View B: The Dashboard (Running)
Layout: CSS Grid (Full Screen).
Top Bar: Live Stats (Active Cases, Contaminated Zones Count, Air Quality Index).
Middle Grid (Split Screen):
Left (Span 6): CustomTownMap (Label: "ENVIRONMENTAL MONITOR").
Overlay: Floating "Ventilation" slider for live intervention.
Right (Span 6): NetworkGraph (Label: "CONTACT TRACING").
Bottom Grid:
Left (Span 4): Timeline (Event Logs).
Right (Span 8): Statistics (Charts).
🖌️ 4. Visualization Components
4.1 CustomTownMap.jsx (The "Wow" Factor)
Goal: Render the "Invisible Cloud" via Canvas.
Rendering Pipeline (requestAnimationFrame):
Clear Canvas.
Layer 1: Bio-Hazard Heatmap:
Iterate through zoneLoads.
For each active zone, calculate (X, Y) center.
Draw ctx.createRadialGradient.
Stops: 0.0 -> rgba(255, 50, 50, opacity), 1.0 -> transparent.
Effect: Soft red clouds pulsating behind the districts.
Layer 2: Nodes:
Draw dots.
Cleanliness Rule: Do NOT draw edges (lines) in this view. Only nodes and clouds.
4.2 NetworkGraph.jsx (The Transmission View)
Goal: Visualize how infection happened.
Logic:
Standard Links: Grey, thin.
Contact Event: Flash link Yellow.
Airborne Event: Draw a Dotted Red Line from the Node to its District Center.
📊 5. Data & Analytics Specification
5.1 Statistics.jsx (New Charts)
Air Quality Index (AQI):
Line Chart.
Data: stats.avg_aqi from backend.
Y-Axis: "Viral Particles / m³".
Transmission Vector Breakdown:
Stacked Area Chart.
Series A: "Direct Contact" (Red).
Series B: "Environmental" (Purple).
5.2 Timeline.jsx (Rich Logging)
Logic:
If method == 'contact': [CONTACT] Node 45 infected by Node 12.
If method == 'airborne': [AIRBORNE] Node 88 inhaled viral load in Zone 5.
🛡️ 6. Zero-Lag Performance Rules
No React Render Loops: CustomTownMap and NetworkGraph must use useRef to store WebSocket data and update the Canvas imperatively. Do not use useState for high-frequency data.
Canvas Optimization: Use ctx.globalCompositeOperation = 'lighter' for heatmaps (additive blending) for a glowing effect without CPU cost.
Memory Management: The "Stop/Reset" button must explicitly close the WebSocket and clear the backend Generator to prevent "Ghost" simulations from running in the background.