import pandas as pd
import networkx as nx
import glob
import os

# Configuration
DATASET_PATH = os.path.join("..", "dataset") # Looks one folder up

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
    
    # Read all files into a list of dataframes
    df_list = []
    for filename in all_files:
        try:
            # SocioPatterns format: timestamp <tab> id1 <tab> id2
            df = pd.read_csv(filename, sep='\t', header=None, names=['timestamp', 'u', 'v'])
            df_list.append(df)
        except Exception as e:
            print(f"⚠️ Error reading {filename}: {e}")

    if not df_list:
        raise ValueError("No data could be loaded.")

    # Combine into one massive timeline
    full_df = pd.concat(df_list, ignore_index=True)
    
    # Sort by time (CRITICAL for the simulation loop)
    full_df.sort_values('timestamp', inplace=True)
    
    # --- OPTIMIZATION: ID MAPPING ---
    # Map huge IDs (e.g., 78577671) to simple integers (0, 1, 2) for array efficiency
    unique_ids = pd.unique(full_df[['u', 'v']].values.ravel('K'))
    id_map = {original: new_id for new_id, original in enumerate(unique_ids)}
    
    full_df['u'] = full_df['u'].map(id_map)
    full_df['v'] = full_df['v'].map(id_map)
    
    print(f"✅ Data Loaded! {len(full_df)} contacts between {len(unique_ids)} people.")
    
    # Create a static graph for the Force-Directed Layout calculations
    G = nx.from_pandas_edgelist(full_df, 'u', 'v')
    
    return full_df, G, id_map

# Load data once when this module is imported
try:
    contacts_df, static_graph, id_mapping = load_data()
except Exception as e:
    print(f"Error during initialization: {e}")
    contacts_df, static_graph, id_mapping = None, None, None