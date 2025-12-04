import heapq
import random
import pandas as pd

def run_simulation(contacts_df, patient_zero_count=5, transmission_prob=0.1, recovery_days=2):
    """
    Runs an Event-Driven SIR Simulation on the temporal data.
    """
    if contacts_df is None:
        return {"error": "Data not loaded"}

    # --- 1. Data Structures ---
    # Status Map: 0 = Susceptible, 1 = Infected, 2 = Recovered
    status = {} 
    
    # Priority Queue (Min-Heap) for Recoveries: Stores (time_to_recover, node_id)
    recovery_queue = [] 
    
    # History Log: To send to React
    history = []

    # --- 2. Initialization ---
    # Get all unique nodes. CAUTION: These are numpy.int64 types!
    unique_nodes = pd.unique(contacts_df[['u', 'v']].values.ravel('K'))
    
    # Set everyone to Susceptible initially
    for node in unique_nodes:
        status[node] = 0 

    # Pick Patient Zeros
    # CRITICAL FIX: Convert numpy.int64 -> Python int for JSON serialization
    initial_sample = random.sample(list(unique_nodes), patient_zero_count)
    initial_infected = [int(node) for node in initial_sample]
    
    start_time = contacts_df['timestamp'].iloc[0]
    recovery_duration_seconds = recovery_days * 24 * 60 * 60
    
    # Infect Patient Zeros
    for node in initial_infected:
        status[node] = 1
        # Schedule their recovery in the Heap
        heapq.heappush(recovery_queue, (start_time + recovery_duration_seconds, node))
    
    # Record Initial State
    history.append({
        "time": int(start_time),
        "infected": initial_infected, # These are now safe Python ints
        "recovered": []
    })

    # --- 3. The Simulation Loop ---
    current_infected_ids = set(initial_infected)
    current_recovered_ids = set()
    
    # Group by time to process "chunks" of interactions
    grouped = contacts_df.groupby('timestamp')
    
    for timestamp, group in grouped:
        newly_infected = []
        newly_recovered = []
        
        # A. Process Recoveries (Min-Heap Logic)
        while recovery_queue and recovery_queue[0][0] <= timestamp:
            rec_time, node = heapq.heappop(recovery_queue)
            # Use .get() to safely check status
            if status.get(node) == 1: 
                status[node] = 2  # Set to Recovered
                current_infected_ids.remove(node)
                current_recovered_ids.add(node)
                # FIX: Convert to int()
                newly_recovered.append(int(node))

        # B. Process Transmissions (Interaction Logic)
        for row in group.itertuples():
            u, v = row.u, row.v
            
            # Check statuses safely
            stat_u = status.get(u, 0)
            stat_v = status.get(v, 0)

            # Case 1: U infects V
            if stat_u == 1 and stat_v == 0:
                if random.random() < transmission_prob:
                    status[v] = 1
                    current_infected_ids.add(v)
                    # FIX: Convert to int()
                    newly_infected.append(int(v))
                    heapq.heappush(recovery_queue, (timestamp + recovery_duration_seconds, v))
            
            # Case 2: V infects U
            elif stat_v == 1 and stat_u == 0:
                if random.random() < transmission_prob:
                    status[u] = 1
                    current_infected_ids.add(u)
                    # FIX: Convert to int()
                    newly_infected.append(int(u))
                    heapq.heappush(recovery_queue, (timestamp + recovery_duration_seconds, u))

        # C. Record State (Only if something changed to save bandwidth)
        if newly_infected or newly_recovered:
            history.append({
                "time": int(timestamp),
                "new_infected": newly_infected,
                "new_recovered": newly_recovered,
                "total_infected": len(current_infected_ids),
                "total_recovered": len(current_recovered_ids)
            })

    return history