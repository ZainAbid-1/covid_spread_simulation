import heapq
import random
import pandas as pd
import numpy as np

SUSCEPTIBLE = 0
EXPOSED = 1
INFECTIOUS = 2
RECOVERED = 3

EVENT_BECOME_INFECTIOUS = 1
EVENT_RECOVER = 2

def run_simulation(contacts_df, patient_zero_count=5, transmission_prob=0.1, recovery_days=2, incubation_days=3):
    """
    Runs an Event-Driven SEIR Simulation on the temporal data.
    Returns complete history list for backward compatibility.
    """
    history = []
    for step in run_simulation_generator(contacts_df, patient_zero_count, transmission_prob, recovery_days, incubation_days):
        if "error" in step:
            return step
        history.append(step)
    return history

def run_simulation_generator(contacts_df, patient_zero_count=5, transmission_prob=0.1, recovery_days=2, incubation_days=3):
    """
    Generator version: Yields simulation steps one at a time for SEIR model.
    Memory-efficient for streaming via WebSocket.
    """
    if contacts_df is None:
        yield {"error": "Data not loaded"}
        return

    status = {}
    event_queue = []
    
    unique_nodes = pd.unique(contacts_df[['u', 'v']].values.ravel('K'))
    
    for node in unique_nodes:
        status[node] = SUSCEPTIBLE

    initial_sample = random.sample(list(unique_nodes), patient_zero_count)
    initial_infected = [int(node) for node in initial_sample]
    
    start_time = contacts_df['timestamp'].iloc[0]
    
    def sample_recovery_duration():
        mean_days = recovery_days
        std_dev = max(1, recovery_days * 0.2)
        sampled_days = np.random.normal(mean_days, std_dev)
        sampled_days = max(1, sampled_days)
        return sampled_days * 24 * 60 * 60
    
    def sample_incubation_duration():
        mean_days = incubation_days
        std_dev = max(1, incubation_days * 0.2)
        sampled_days = np.random.normal(mean_days, std_dev)
        sampled_days = max(1, sampled_days)
        return sampled_days * 24 * 60 * 60
    
    for node in initial_infected:
        status[node] = INFECTIOUS
        recovery_duration = sample_recovery_duration()
        heapq.heappush(event_queue, (start_time + recovery_duration, EVENT_RECOVER, node))
    
    yield {
        "time": int(start_time),
        "infected": initial_infected,
        "exposed": [],
        "recovered": []
    }

    current_infected_ids = set(initial_infected)
    current_exposed_ids = set()
    current_recovered_ids = set()
    
    grouped = contacts_df.groupby('timestamp')
    
    for timestamp, group in grouped:
        newly_exposed = []
        newly_infected = []
        newly_recovered = []
        
        while event_queue and event_queue[0][0] <= timestamp:
            event_time, event_type, node = heapq.heappop(event_queue)
            
            if event_type == EVENT_BECOME_INFECTIOUS:
                if status.get(node) == EXPOSED:
                    status[node] = INFECTIOUS
                    current_exposed_ids.discard(node)
                    current_infected_ids.add(node)
                    newly_infected.append(int(node))
                    
                    recovery_duration = sample_recovery_duration()
                    heapq.heappush(event_queue, (timestamp + recovery_duration, EVENT_RECOVER, node))
            
            elif event_type == EVENT_RECOVER:
                if status.get(node) == INFECTIOUS:
                    status[node] = RECOVERED
                    current_infected_ids.discard(node)
                    current_recovered_ids.add(node)
                    newly_recovered.append(int(node))

        for row in group.itertuples():
            u, v = row.u, row.v
            
            stat_u = status.get(u, SUSCEPTIBLE)
            stat_v = status.get(v, SUSCEPTIBLE)

            if stat_u == INFECTIOUS and stat_v == SUSCEPTIBLE:
                if random.random() < transmission_prob:
                    status[v] = EXPOSED
                    current_exposed_ids.add(v)
                    newly_exposed.append(int(v))
                    
                    incubation_duration = sample_incubation_duration()
                    heapq.heappush(event_queue, (timestamp + incubation_duration, EVENT_BECOME_INFECTIOUS, v))
            
            elif stat_v == INFECTIOUS and stat_u == SUSCEPTIBLE:
                if random.random() < transmission_prob:
                    status[u] = EXPOSED
                    current_exposed_ids.add(u)
                    newly_exposed.append(int(u))
                    
                    incubation_duration = sample_incubation_duration()
                    heapq.heappush(event_queue, (timestamp + incubation_duration, EVENT_BECOME_INFECTIOUS, u))

        if newly_exposed or newly_infected or newly_recovered:
            yield {
                "time": int(timestamp),
                "new_exposed": newly_exposed,
                "new_infected": newly_infected,
                "new_recovered": newly_recovered,
                "total_exposed": len(current_exposed_ids),
                "total_infected": len(current_infected_ids),
                "total_recovered": len(current_recovered_ids)
            }