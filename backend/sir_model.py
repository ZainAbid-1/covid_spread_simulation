import heapq
import random
import pandas as pd
import numpy as np

def run_simulation(contacts_df, patient_zero_count=5, transmission_prob=0.1, recovery_days=2):
    """
    Runs an Event-Driven SIR Simulation on the temporal data.
    Returns complete history list for backward compatibility.
    """
    history = []
    for step in run_simulation_generator(contacts_df, patient_zero_count, transmission_prob, recovery_days):
        if "error" in step:
            return step
        history.append(step)
    return history

def run_simulation_generator(contacts_df, patient_zero_count=5, transmission_prob=0.1, recovery_days=2):
    """
    Generator version: Yields simulation steps one at a time.
    Memory-efficient for streaming via WebSocket.
    """
    if contacts_df is None:
        yield {"error": "Data not loaded"}
        return

    status = {}
    recovery_queue = []
    
    unique_nodes = pd.unique(contacts_df[['u', 'v']].values.ravel('K'))
    
    for node in unique_nodes:
        status[node] = 0 

    initial_sample = random.sample(list(unique_nodes), patient_zero_count)
    initial_infected = [int(node) for node in initial_sample]
    
    start_time = contacts_df['timestamp'].iloc[0]
    
    def sample_recovery_duration():
        mean_days = recovery_days
        std_dev = max(1, recovery_days * 0.2)
        sampled_days = np.random.normal(mean_days, std_dev)
        sampled_days = max(1, sampled_days)
        return sampled_days * 24 * 60 * 60
    
    for node in initial_infected:
        status[node] = 1
        recovery_duration = sample_recovery_duration()
        heapq.heappush(recovery_queue, (start_time + recovery_duration, node))
    
    yield {
        "time": int(start_time),
        "infected": initial_infected,
        "recovered": []
    }

    current_infected_ids = set(initial_infected)
    current_recovered_ids = set()
    
    grouped = contacts_df.groupby('timestamp')
    
    for timestamp, group in grouped:
        newly_infected = []
        newly_recovered = []
        
        while recovery_queue and recovery_queue[0][0] <= timestamp:
            rec_time, node = heapq.heappop(recovery_queue)
            if status.get(node) == 1: 
                status[node] = 2
                current_infected_ids.remove(node)
                current_recovered_ids.add(node)
                newly_recovered.append(int(node))

        for row in group.itertuples():
            u, v = row.u, row.v
            
            stat_u = status.get(u, 0)
            stat_v = status.get(v, 0)

            if stat_u == 1 and stat_v == 0:
                if random.random() < transmission_prob:
                    status[v] = 1
                    current_infected_ids.add(v)
                    newly_infected.append(int(v))
                    recovery_duration = sample_recovery_duration()
                    heapq.heappush(recovery_queue, (timestamp + recovery_duration, v))
            
            elif stat_v == 1 and stat_u == 0:
                if random.random() < transmission_prob:
                    status[u] = 1
                    current_infected_ids.add(u)
                    newly_infected.append(int(u))
                    recovery_duration = sample_recovery_duration()
                    heapq.heappush(recovery_queue, (timestamp + recovery_duration, u))

        if newly_infected or newly_recovered:
            yield {
                "time": int(timestamp),
                "new_infected": newly_infected,
                "new_recovered": newly_recovered,
                "total_infected": len(current_infected_ids),
                "total_recovered": len(current_recovered_ids)
            }