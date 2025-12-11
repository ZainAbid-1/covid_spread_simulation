import pandas as pd
import networkx as nx
import glob
import os
import math
import random as py_random
import community.community_louvain as community_louvain
from config import Config

DATASET_PATH = os.path.join("..", "dataset")

communities = {}

def compute_graph_layout(G):
    """
    Computes an "Archipelago" layout with distinct districts (communities).
    Uses Louvain community detection to group nodes into islands.
    """
    global communities
    
    graph_size = len(G.nodes())
    settings = Config.get_layout_settings(graph_size)
    
    print(f"📊 Graph size: {graph_size} nodes")
    print(f"🎯 Detecting communities for Archipelago layout...")
    
    communities = community_louvain.best_partition(G)
    num_communities = len(set(communities.values()))
    
    print(f"🏝️ Found {num_communities} districts (communities)")
    
    community_centers = {}
    grid_side = math.ceil(math.sqrt(num_communities))
    spacing = 400
    
    for i, comm_id in enumerate(set(communities.values())):
        row = i // grid_side
        col = i % grid_side
        center_x = col * spacing + py_random.uniform(-500, 500)
        center_y = row * spacing + py_random.uniform(-500, 500)
        community_centers[comm_id] = (center_x, center_y)
    
    initial_pos = {}
    for node, comm_id in communities.items():
        center_x, center_y = community_centers[comm_id]
        noise_x = py_random.uniform(-200, 200)
        noise_y = py_random.uniform(-200, 200)
        initial_pos[node] = (center_x + noise_x, center_y + noise_y)
    
    print(f"🎨 Applying constrained spring layout with high repulsion (k={settings.get('k', 2.0)})...")
    
    pos = nx.spring_layout(
        G,
        pos=initial_pos,
        k=settings.get("k", 2.0),
        iterations=settings["iterations"],
        seed=42
    )
    
    for node in pos:
        pos[node] = (pos[node][0] * 1000, pos[node][1] * 1000)
    
    return pos

def load_data():
    """
    Reads all listcontacts files, merges them, and normalizes IDs.
    Returns:
        df (pd.DataFrame): Sorted temporal contact list [timestamp, source, target]
        G (nx.Graph): Static graph for visualization structure
        id_map (dict): Mapping from Original Large ID -> Simple ID (0, 1, 2...)
    """
    print("🔍 Scanning dataset folder...")
    all_files = glob.glob(os.path.join(DATASET_PATH, "listcontacts_*.txt"))
    
    if not all_files:
        raise FileNotFoundError(f"❌ No data files found in {DATASET_PATH}. Did you extract them?")

    print(f"📂 Found {len(all_files)} daily files. Loading... (This might take a moment)")
    
    df_list = []
    for filename in all_files:
        try:
            df = pd.read_csv(filename, sep='\t', header=None, names=['timestamp', 'u', 'v'])
            df_list.append(df)
        except Exception as e:
            print(f"⚠️ Error reading {filename}: {e}")

    if not df_list:
        raise ValueError("No data could be loaded.")

    full_df = pd.concat(df_list, ignore_index=True)
    full_df.sort_values('timestamp', inplace=True)
    
    unique_ids = pd.unique(full_df[['u', 'v']].values.ravel('K'))
    id_map = {original: new_id for new_id, original in enumerate(unique_ids)}
    
    full_df['u'] = full_df['u'].map(id_map)
    full_df['v'] = full_df['v'].map(id_map)
    
    print(f"✅ Data Loaded! {len(full_df)} contacts between {len(unique_ids)} people.")
    
    G = nx.from_pandas_edgelist(full_df, 'u', 'v')
    
    return full_df, G, id_map

try:
    contacts_df, static_graph, id_mapping = load_data()
except Exception as e:
    print(f"Error during initialization: {e}")
    contacts_df, static_graph, id_mapping = None, None, None