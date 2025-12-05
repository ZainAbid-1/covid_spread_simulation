# Disease Spread Simulation - SIR Model Visualization

A real-time interactive visualization of disease spread using the SIR (Susceptible-Infected-Recovered) epidemiological model with temporal contact data.

## 🏗️ System Architecture

This application consists of two main components:

### Backend (Python/FastAPI)
- **Framework**: FastAPI
- **Data Processing**: NetworkX, Pandas
- **Purpose**: Graph processing, SIR simulation engine

### Frontend (React/Vite)
- **Framework**: React 18 with Vite
- **UI Library**: TailwindCSS
- **Visualization**: react-force-graph-2d, Recharts
- **Icons**: Lucide React

---

## 📊 How It Works: Backend to Frontend Flow

### 1. **Initial Data Loading (Backend)**

When the backend starts:

```python
# data_loader.py
1. Scans the dataset folder for contact files (listcontacts_*.txt)
2. Loads temporal contact data (timestamp, person1, person2)
3. Combines all daily contact files into one timeline
4. Sorts by timestamp (CRITICAL for simulation accuracy)
5. Maps large IDs to simple integers (0, 1, 2...) for efficiency
6. Creates a static NetworkX graph for visualization
7. Pre-computes node positions using spring_layout algorithm
```

**Why this matters**:
- The spring layout is computationally expensive, so we calculate it once on the backend
- The static graph structure is used for visualization only
- The actual simulation uses the temporal contact timeline

### 2. **Graph Data API (`/graph-data`)**

**Request**: Frontend requests network structure
```javascript
GET http://localhost:8000/graph-data
```

**Backend Process**:
```python
1. Takes pre-computed node positions from spring_layout
2. Scales positions (x * 1000, y * 1000) for canvas rendering
3. Extracts edges from the static graph
4. Returns JSON with nodes and links
```

**Response**:
```json
{
  "nodes": [
    {"id": 0, "x": 245.3, "y": -102.7},
    {"id": 1, "x": -89.1, "y": 301.2},
    ...
  ],
  "links": [
    {"source": 0, "target": 5},
    {"source": 1, "target": 3},
    ...
  ]
}
```

**Frontend Handling**:
```javascript
1. Receives graph structure
2. Initializes all nodes as 'susceptible'
3. Passes data to ForceGraph2D component
4. Stores in React state for visualization
```

### 3. **Simulation API (`/simulate`)**

**Request**: User clicks "Run Simulation"
```javascript
GET http://localhost:8000/simulate?beta=0.2&gamma_days=2&start_nodes=5
```

**Parameters**:
- `beta`: Transmission probability (0.0 to 1.0)
- `gamma_days`: Recovery time in days
- `start_nodes`: Number of initial infections (patient zeros)

**Backend SIR Simulation Process**:

```python
# sir_model.py

INITIALIZATION:
1. Create status map (0=Susceptible, 1=Infected, 2=Recovered)
2. Initialize everyone as Susceptible
3. Randomly select patient zeros
4. Mark them as Infected
5. Schedule their recovery using a min-heap priority queue
6. Record initial state

SIMULATION LOOP (for each timestamp in contact data):

  A. PROCESS RECOVERIES (Priority Queue):
     - Pop all recoveries scheduled at or before current time
     - Change status: Infected (1) → Recovered (2)
     - Track newly recovered IDs

  B. PROCESS TRANSMISSIONS (Contact-based):
     For each contact (u, v) at current timestamp:
       - If u=Infected and v=Susceptible:
         * Roll dice: random() < beta?
         * If yes: Infect v, schedule recovery
       - If v=Infected and u=Susceptible:
         * Roll dice: random() < beta?
         * If yes: Infect u, schedule recovery

  C. RECORD STATE (if changes occurred):
     - new_infected: List of newly infected IDs
     - new_recovered: List of newly recovered IDs
     - total_infected: Current count
     - total_recovered: Current count
     - time: Current timestamp

RETURN: Complete history of state changes
```

**Why Priority Queue?**
- Efficient O(log n) insertion and removal
- Automatically sorts by recovery time
- No need to check every node at every timestep

**Response**:
```json
[
  {
    "time": 1234567890,
    "infected": [3, 7, 12],
    "recovered": []
  },
  {
    "time": 1234568000,
    "new_infected": [8, 15],
    "new_recovered": [3],
    "total_infected": 3,
    "total_recovered": 1
  },
  ...
]
```

**Frontend Handling**:
```javascript
1. Receives complete simulation history
2. Resets all nodes to 'susceptible'
3. Applies initial infections from first event
4. Stores history in state for playback
5. User controls playback with Play/Pause buttons
```

### 4. **Real-time Playback (Frontend)**

**Playback Engine**:
```javascript
// App.jsx
useEffect(() => {
  if (!isPlaying) return;

  const timer = setTimeout(() => {
    const step = simulationData[currentStep];

    // Update node colors
    step.new_infected?.forEach(id => {
      nodeStates[id] = 'infected'  // Red
    });

    step.new_recovered?.forEach(id => {
      nodeStates[id] = 'recovered'  // Blue
    });

    setCurrentStep(prev => prev + 1);
  }, 100);  // 100ms between steps

  return () => clearTimeout(timer);
}, [isPlaying, currentStep]);
```

**Visualization Updates**:
```javascript
// NetworkGraph.jsx
const getNodeColor = (node) => {
  const state = nodeStates[node.id];
  switch (state) {
    case 'infected': return '#ef4444'   // Red
    case 'recovered': return '#3b82f6'  // Blue
    case 'susceptible': return '#10b981' // Green
  }
}
```

---

## 🎨 Frontend Components

### **App.jsx** (Main Controller)
- Manages application state
- Fetches data from backend
- Controls simulation playback
- Routes data to visualization components

### **NetworkGraph.jsx** (Network Visualization)
- Uses `react-force-graph-2d` for interactive graph
- Node colors change based on infection state
- Infected nodes have animated pulse rings
- Draggable nodes, zoomable/pannable canvas
- Force simulation for smooth town-like layout

### **ControlPanel.jsx** (Simulation Parameters)
- Beta (β): Transmission probability slider
- Gamma (γ): Recovery time slider
- Initial infections: Patient zero count
- Run simulation button

### **Statistics.jsx** (Data Analysis)
- Total nodes, peak infected, final recovered cards
- Stacked area chart (Susceptible/Infected/Recovered over time)
- Line chart (Active cases trend)

### **Timeline.jsx** (Event Log)
- Chronological list of infection/recovery events
- Color-coded by event type
- Shows totals at each timestep

---

## 🎯 Key Features Implemented

### 1. **Smooth Town-like Visualization**
- Adjusted force simulation parameters:
  - Charge strength: -120 (nodes repel each other)
  - Link distance: 40 (balanced spacing)
  - Center strength: 0.05 (gentle centering)
- Nodes organized in a natural, spread-out layout
- Easy dragging and zooming

### 2. **Legend Positioning**
- Moved to **top-right corner**
- No longer overlaps with playback controls
- Semi-transparent background with backdrop blur
- Clean, professional appearance

### 3. **Interactive Controls**
- Drag individual nodes to rearrange
- Scroll to zoom in/out
- Click and drag background to pan
- Auto-fit view when simulation loads

### 4. **Visual Feedback**
- Infected nodes pulse with animated rings
- Color transitions are smooth
- Real-time status updates in sidebar

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND (Python)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Dataset Files                                               │
│  ┌──────────────────┐                                       │
│  │ listcontacts_*.txt│                                      │
│  └────────┬──────────┘                                      │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────────┐      ┌──────────────────┐          │
│  │  data_loader.py    │      │  sir_model.py    │          │
│  │                    │      │                  │          │
│  │ • Load contacts    │      │ • Event-driven   │          │
│  │ • ID mapping       │      │ • Priority queue │          │
│  │ • Create graph     │      │ • State tracking │          │
│  │ • Spring layout    │      │                  │          │
│  └─────────┬──────────┘      └────────┬─────────┘          │
│            │                           │                     │
│            └───────────┬───────────────┘                     │
│                        │                                     │
│                        ▼                                     │
│              ┌──────────────────┐                           │
│              │    app.py        │                           │
│              │   (FastAPI)      │                           │
│              └─────────┬────────┘                           │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         │ HTTP REST API
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                 App.jsx (State Manager)            │    │
│  │                                                     │    │
│  │  • GraphData state                                 │    │
│  │  • SimulationData state                            │    │
│  │  • NodeStates state                                │    │
│  │  • Playback control                                │    │
│  └─┬──────────────┬───────────────┬──────────────────┘    │
│    │              │               │                        │
│    ▼              ▼               ▼                        │
│  ┌────────┐  ┌─────────┐  ┌──────────┐                   │
│  │Control │  │Network  │  │Statistics│                    │
│  │Panel   │  │Graph    │  │Timeline  │                    │
│  └────────┘  └─────────┘  └──────────┘                   │
│                                                             │
│  User interacts → Updates parameters → Triggers API call   │
│                → Receives data → Updates visualization      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Running the Application

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs on: `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## 📝 API Endpoints

### `GET /`
Health check endpoint
```json
{"status": "Backend is running", "nodes": 413}
```

### `GET /graph-data`
Returns network structure with node positions and edges
```json
{
  "nodes": [{"id": 0, "x": 100, "y": 200}, ...],
  "links": [{"source": 0, "target": 1}, ...]
}
```

### `GET /simulate?beta=0.2&gamma_days=2&start_nodes=5`
Runs SIR simulation and returns complete history
```json
[
  {
    "time": 1234567890,
    "infected": [3, 7],
    "recovered": [],
    "total_infected": 2,
    "total_recovered": 0
  },
  ...
]
```

---

## 🧪 SIR Model Explanation

### States
- **S (Susceptible)**: Healthy, can be infected
- **I (Infected)**: Currently infected, can spread disease
- **R (Recovered)**: Immune, cannot be infected or spread

### Transitions
```
S --[Contact with I, probability β]--> I --[After γ days]--> R
```

### Parameters
- **β (Beta)**: Transmission probability per contact (0.0 - 1.0)
  - Higher = more contagious
- **γ (Gamma)**: Recovery time in days (1-14)
  - Lower = faster recovery

### Event-Driven Approach
Instead of checking every node at every timestep:
1. Only process contacts when they occur
2. Use priority queue for scheduled recoveries
3. Much more efficient for sparse temporal networks

---

## 🎮 User Controls

### Simulation Parameters
- Adjust β, γ, initial infections
- Click "Run Simulation"
- Backend processes and returns results

### Playback Controls
- **Play/Pause**: Control animation
- **Reset**: Clear simulation and start over
- **Timeline**: See current step / total steps

### Visualization Controls
- **Drag nodes**: Rearrange network layout
- **Scroll**: Zoom in/out
- **Drag background**: Pan view
- **Tab switching**: Network / Statistics / Timeline views

---

## 📊 Data Format

### Input (SocioPatterns Format)
```
timestamp    id1    id2
1234567890   12     45
1234567891   23     67
```

### Node States (Internal)
```javascript
{
  0: 'susceptible',  // Green
  1: 'infected',     // Red (pulsing)
  2: 'recovered',    // Blue
  ...
}
```

### Simulation History
```javascript
[
  {
    time: 1234567890,
    infected: [3, 7, 12],        // Initial infections
    recovered: []
  },
  {
    time: 1234568000,
    new_infected: [8, 15],        // New infections at this step
    new_recovered: [3],           // New recoveries at this step
    total_infected: 3,            // Current total
    total_recovered: 1            // Current total
  }
]
```

---

## 🔍 Performance Optimizations

### Backend
- **ID Mapping**: Large IDs → Small integers (reduces memory)
- **Pre-computed Layout**: Spring layout calculated once
- **Efficient Data Structures**: Priority queue for recoveries
- **Event-driven**: Only process actual contacts

### Frontend
- **State Management**: React hooks for optimal re-renders
- **Debounced Updates**: 100ms between animation frames
- **Canvas Rendering**: Hardware-accelerated via ForceGraph2D
- **Lazy Loading**: Components load on-demand

---

## 🛠️ Technologies Used

### Backend
- **FastAPI**: Modern async web framework
- **NetworkX**: Graph algorithms and layout
- **Pandas**: Data manipulation
- **CORS Middleware**: Cross-origin requests

### Frontend
- **React 18**: Modern hooks-based architecture
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first styling
- **react-force-graph-2d**: D3-based graph visualization
- **Recharts**: Responsive chart library
- **Lucide React**: Beautiful icon set

---

## 📚 Further Reading

- [SIR Model on Wikipedia](https://en.wikipedia.org/wiki/Compartmental_models_in_epidemiology)
- [NetworkX Documentation](https://networkx.org/)
- [ForceGraph2D Documentation](https://github.com/vasturiano/react-force-graph)
- [SocioPatterns Dataset](http://www.sociopatterns.org/)

---

## 🐛 Troubleshooting

### Legend overlaps with controls
✅ **Fixed**: Legend now in top-right corner

### Network looks like a ball/globe
✅ **Fixed**: Adjusted force parameters for town-like spread

### Nodes don't respond to dragging
- Check if `enableNodeDrag={true}` in NetworkGraph.jsx
- Ensure graph is fully loaded before interaction

### Backend not connecting
- Verify backend is running on port 8000
- Check CORS settings in app.py
- Ensure dataset files are in correct location

### Animation is choppy
- Reduce cooldown ticks in ForceGraph2D
- Limit number of edges displayed
- Use a more powerful GPU for rendering

---

## 📄 License

MIT License - Feel free to use for educational and research purposes.

---

## 👥 Contributors

Built with ❤️ for epidemiological research and visualization.
