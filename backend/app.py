from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import networkx as nx
import data_loader as data_loader
import sir_model as sir_model

app = FastAPI()

# Allow React to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change to ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache the graph layout so we don't recompute it every reload (Expensive!)
# Using Spring Layout (Force-Directed) as required by the PDF
print(" 🧠 Pre-computing Force-Directed Layout... (This runs once)")
if data_loader.static_graph:
    # k=0.15 controls node spacing. Iterations=50 for speed vs accuracy.
    pos = nx.spring_layout(data_loader.static_graph, k=0.15, iterations=20, seed=42)
else:
    pos = {}
print(" ✅ Layout computed.")

@app.get("/")
def read_root():
    return {"status": "Backend is running", "nodes": len(pos)}

@app.get("/graph-data")
def get_graph_structure():
    """
    Returns the Nodes (with x,y coordinates) and Edges.
    Visualization Requirement: Force-Directed Graph.
    """
    nodes = []
    for node_id, (x, y) in pos.items():
        nodes.append({"id": int(node_id), "x": x * 1000, "y": y * 1000}) # Scale up for canvas

    # We limit edges for the frontend visualization to avoid lag if > 50k edges
    # We only send edges if they appeared in the contact list
    edges = []
    # Use the static graph edges
    for u, v in data_loader.static_graph.edges():
        edges.append({"source": int(u), "target": int(v)})

    return {"nodes": nodes, "links": edges}

@app.get("/simulate")
def run_sim(beta: float = 0.2, gamma_days: int = 2, start_nodes: int = 5):
    """
    Runs the SIR model with custom parameters.
    beta: Transmission probability per contact (0.0 to 1.0)
    gamma_days: How many days until recovery
    start_nodes: Number of initially infected people
    """
    print(f"🧪 Starting Simulation: p={beta}, rec={gamma_days} days")
    results = sir_model.run_simulation(
        data_loader.contacts_df,
        patient_zero_count=start_nodes,
        transmission_prob=beta,
        recovery_days=gamma_days
    )
    return results