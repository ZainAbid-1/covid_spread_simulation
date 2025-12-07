from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import networkx as nx
import json
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

print("🧠 Pre-computing Optimized Graph Layout...")
if data_loader.static_graph:
    pos = data_loader.compute_graph_layout(data_loader.static_graph)
else:
    pos = {}
print("✅ Layout computed.")

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
        nodes.append({"id": int(node_id), "x": x * 2000, "y": y * 2000})

    edges = []
    edge_list = list(data_loader.static_graph.edges())
    total_edges = len(edge_list)
    
    for u, v in edge_list:
        edges.append({"source": int(u), "target": int(v)})
    
    print(f"⚡ Sending all {total_edges} edges and {len(nodes)} nodes")

    return {"nodes": nodes, "links": edges}

@app.get("/simulate")
def run_sim(beta: float = 0.2, gamma_days: int = 2, start_nodes: int = 5):
    """
    Legacy endpoint: Returns complete simulation results at once.
    For backward compatibility with existing frontend code.
    """
    print(f"🧪 Starting Batch Simulation: p={beta}, rec={gamma_days} days")
    results = sir_model.run_simulation(
        data_loader.contacts_df,
        patient_zero_count=start_nodes,
        transmission_prob=beta,
        recovery_days=gamma_days
    )
    return results

@app.websocket("/ws/simulate")
async def websocket_simulate(websocket: WebSocket):
    """
    WebSocket endpoint: Streams simulation results step-by-step.
    Prevents timeout and reduces memory consumption.
    Client receives data as it's computed.
    """
    await websocket.accept()
    
    try:
        data = await websocket.receive_text()
        params = json.loads(data)
        
        beta = float(params.get("beta", 0.2))
        gamma_days = int(params.get("gamma_days", 2))
        start_nodes = int(params.get("start_nodes", 5))
        
        print(f"🧪 Starting Streaming Simulation: p={beta}, rec={gamma_days} days")
        
        for step in sir_model.run_simulation_generator(
            data_loader.contacts_df,
            patient_zero_count=start_nodes,
            transmission_prob=beta,
            recovery_days=gamma_days
        ):
            await websocket.send_json(step)
        
        await websocket.send_json({"done": True})
        print("✅ Simulation stream completed")
        
    except WebSocketDisconnect:
        print("⚠️ Client disconnected during simulation")
    except Exception as e:
        print(f"❌ Error in WebSocket simulation: {e}")
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()