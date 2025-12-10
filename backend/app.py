from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import networkx as nx
import json
import data_loader as data_loader
import sir_model as sir_model
import measles_model

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
    Returns the Nodes (with x,y coordinates, community_id) and Edges.
    Visualization Requirement: Force-Directed Graph with District (Community) information.
    """
    nodes = []
    for node_id, (x, y) in pos.items():
        community_id = data_loader.communities.get(node_id, 0)
        nodes.append({
            "id": int(node_id), 
            "x": x, 
            "y": y,
            "community": int(community_id)
        })

    edges = []
    edge_list = list(data_loader.static_graph.edges())
    total_edges = len(edge_list)
    
    for u, v in edge_list:
        edges.append({"source": int(u), "target": int(v)})
    
    num_communities = len(set(data_loader.communities.values())) if data_loader.communities else 0
    
    print(f"⚡ Sending all {total_edges} edges and {len(nodes)} nodes across {num_communities} districts")

    return {"nodes": nodes, "links": edges, "num_communities": num_communities}

@app.get("/simulate")
def run_sim(beta: float = 0.2, gamma_days: int = 2, start_nodes: int = 5, incubation_days: int = 3):
    """
    Legacy endpoint: Returns complete simulation results at once.
    For backward compatibility with existing frontend code.
    """
    print(f"🧪 Starting Batch Simulation: p={beta}, rec={gamma_days} days, incubation={incubation_days} days")
    results = sir_model.run_simulation(
        data_loader.contacts_df,
        patient_zero_count=start_nodes,
        transmission_prob=beta,
        recovery_days=gamma_days,
        incubation_days=incubation_days
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
        incubation_days = int(params.get("incubation_days", 3))
        
        print(f"🧪 Starting Streaming Simulation: p={beta}, rec={gamma_days} days, incubation={incubation_days} days")
        
        for step in sir_model.run_simulation_generator(
            data_loader.contacts_df,
            patient_zero_count=start_nodes,
            transmission_prob=beta,
            recovery_days=gamma_days,
            incubation_days=incubation_days
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

@app.websocket("/ws/simulate-measles")
async def websocket_simulate_measles(websocket: WebSocket):
    """
    WebSocket endpoint for Measles (Airborne) simulation with Environmental Memory.
    Streams simulation results step-by-step with zone contamination data.
    """
    await websocket.accept()
    
    try:
        data = await websocket.receive_text()
        params = json.loads(data)
        
        beta = float(params.get("beta", 0.2))
        gamma_days = int(params.get("gamma_days", 7))
        start_nodes = int(params.get("start_nodes", 5))
        incubation_days = int(params.get("incubation_days", 10))
        ventilation_rate = float(params.get("ventilation_rate", 0.05))
        shedding_rate = float(params.get("shedding_rate", 10.0))
        beta_air = float(params.get("beta_air", 0.0001))
        
        print(f"🦠 Starting Measles Simulation: β={beta}, recovery={gamma_days} days, "
              f"incubation={incubation_days} days, ventilation={ventilation_rate}")
        
        for step in measles_model.run_measles_simulation_generator(
            data_loader.contacts_df,
            data_loader.communities,
            patient_zero_count=start_nodes,
            transmission_prob=beta,
            recovery_days=gamma_days,
            incubation_days=incubation_days,
            ventilation_rate=ventilation_rate,
            shedding_rate=shedding_rate,
            beta_air=beta_air
        ):
            await websocket.send_json(step)
        
        await websocket.send_json({"done": True})
        print("✅ Measles simulation stream completed")
        
    except WebSocketDisconnect:
        print("⚠️ Client disconnected during measles simulation")
    except Exception as e:
        print(f"❌ Error in WebSocket measles simulation: {e}")
        import traceback
        traceback.print_exc()
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()