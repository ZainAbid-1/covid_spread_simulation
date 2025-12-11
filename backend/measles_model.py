import heapq
import random
import pandas as pd
import numpy as np
import math
from config import Config

SUSCEPTIBLE = 0
EXPOSED = 1
INFECTIOUS = 2
RECOVERED = 3
DEAD = 4

EVENT_BECOME_INFECTIOUS = 1
EVENT_RECOVER = 2

class MeaslesSimulation:
    def __init__(self, contacts_df, communities, transmission_prob=0.2, recovery_days=7, 
                 incubation_days=10, ventilation_rate=None, shedding_rate=None, beta_air=None, mortality_rate=0.0):
        self.contacts_df = contacts_df
        self.communities = communities
        self.transmission_prob = transmission_prob
        self.recovery_days = recovery_days
        self.incubation_days = incubation_days
        self.mortality_rate = mortality_rate
        
        self.ventilation_rate = ventilation_rate if ventilation_rate is not None else Config.MEASLES_VENTILATION_RATE
        self.shedding_rate = shedding_rate if shedding_rate is not None else Config.MEASLES_SHEDDING_RATE
        self.beta_air = beta_air if beta_air is not None else Config.MEASLES_BETA_AIR
        
        self.zone_map = {}
        self.node_states = {}
        self.event_queue = []
        
        unique_nodes = pd.unique(contacts_df[['u', 'v']].values.ravel('K'))
        for node in unique_nodes:
            self.node_states[node] = SUSCEPTIBLE
        
        for comm_id in set(communities.values()):
            self.zone_map[comm_id] = 0.0
    
    def sample_recovery_duration(self):
        mean_days = self.recovery_days
        std_dev = max(1, self.recovery_days * 0.2)
        sampled_days = np.random.normal(mean_days, std_dev)
        sampled_days = max(1, sampled_days)
        return sampled_days * 24 * 60 * 60
    
    def sample_incubation_duration(self):
        mean_days = self.incubation_days
        std_dev = max(1, self.incubation_days * 0.2)
        sampled_days = np.random.normal(mean_days, std_dev)
        sampled_days = max(1, sampled_days)
        return sampled_days * 24 * 60 * 60
    
    def infect_node(self, node, timestamp, method="contact", source=None, source_zone=None):
        self.node_states[node] = EXPOSED
        incubation_duration = self.sample_incubation_duration()
        heapq.heappush(self.event_queue, (timestamp + incubation_duration, EVENT_BECOME_INFECTIOUS, node))
        
        return {
            "id": int(node),
            "method": method,
            "source": int(source) if source is not None else None,
            "zone": int(source_zone) if source_zone is not None else None
        }
    
    def step(self, timestamp, contact_group):
        new_infections = []
        newly_exposed = []
        newly_infected = []
        newly_recovered = []
        newly_dead = []
        
        for zone_id in self.zone_map:
            self.zone_map[zone_id] *= (1.0 - self.ventilation_rate)
        
        infected_nodes = [node for node, state in self.node_states.items() if state == INFECTIOUS]
        for node in infected_nodes:
            zone = self.communities.get(node, 0)
            self.zone_map[zone] += self.shedding_rate
        
        while self.event_queue and self.event_queue[0][0] <= timestamp:
            event_time, event_type, node = heapq.heappop(self.event_queue)
            
            if event_type == EVENT_BECOME_INFECTIOUS:
                if self.node_states.get(node) == EXPOSED:
                    self.node_states[node] = INFECTIOUS
                    newly_infected.append(int(node))
                    
                    recovery_duration = self.sample_recovery_duration()
                    heapq.heappush(self.event_queue, (timestamp + recovery_duration, EVENT_RECOVER, node))
            
            elif event_type == EVENT_RECOVER:
                if self.node_states.get(node) == INFECTIOUS:
                    if random.random() < self.mortality_rate:
                        self.node_states[node] = DEAD
                        newly_dead.append(int(node))
                    else:
                        self.node_states[node] = RECOVERED
                        newly_recovered.append(int(node))
        
        for row in contact_group.itertuples():
            u, v = row.u, row.v
            
            stat_u = self.node_states.get(u, SUSCEPTIBLE)
            stat_v = self.node_states.get(v, SUSCEPTIBLE)
            
            if stat_u == INFECTIOUS and stat_v == SUSCEPTIBLE:
                if random.random() < self.transmission_prob:
                    infection_data = self.infect_node(v, timestamp, method="contact", source=u)
                    new_infections.append(infection_data)
                    newly_exposed.append(int(v))
            
            elif stat_v == INFECTIOUS and stat_u == SUSCEPTIBLE:
                if random.random() < self.transmission_prob:
                    infection_data = self.infect_node(u, timestamp, method="contact", source=v)
                    new_infections.append(infection_data)
                    newly_exposed.append(int(u))
        
        susceptible_nodes = [node for node, state in self.node_states.items() if state == SUSCEPTIBLE]
        for node in susceptible_nodes:
            zone = self.communities.get(node, 0)
            zone_load = self.zone_map.get(zone, 0.0)
            
            if zone_load > 0:
                prob = 1.0 - math.exp(-self.beta_air * zone_load)
                
                if random.random() < prob:
                    infection_data = self.infect_node(node, timestamp, method="airborne", source_zone=zone)
                    new_infections.append(infection_data)
                    newly_exposed.append(int(node))
        
        zone_updates = {int(zone_id): float(load) for zone_id, load in self.zone_map.items() if load > 0.1}
        
        total_aqi = sum(self.zone_map.values())
        num_zones = len([z for z in self.zone_map.values() if z > 0])
        avg_aqi = total_aqi / num_zones if num_zones > 0 else 0.0
        
        current_exposed = len([n for n, s in self.node_states.items() if s == EXPOSED])
        current_infected = len([n for n, s in self.node_states.items() if s == INFECTIOUS])
        current_recovered = len([n for n, s in self.node_states.items() if s == RECOVERED])
        current_dead = len([n for n, s in self.node_states.items() if s == DEAD])
        
        return {
            "time": int(timestamp),
            "new_infections": new_infections,
            "new_exposed": newly_exposed,
            "new_infected": newly_infected,
            "new_recovered": newly_recovered,
            "new_dead": newly_dead,
            "zone_updates": zone_updates,
            "stats": {
                "avg_aqi": float(avg_aqi),
                "total_aqi": float(total_aqi),
                "contaminated_zones": num_zones
            },
            "total_exposed": current_exposed,
            "total_infected": current_infected,
            "total_recovered": current_recovered,
            "total_dead": current_dead
        }

def run_measles_simulation_generator(contacts_df, communities, patient_zero_count=5, 
                                      transmission_prob=0.2, recovery_days=7, incubation_days=10,
                                      ventilation_rate=None, shedding_rate=None, beta_air=None, mortality_rate=0.0):
    if contacts_df is None:
        yield {"error": "Data not loaded"}
        return
    
    sim = MeaslesSimulation(
        contacts_df, 
        communities,
        transmission_prob=transmission_prob,
        recovery_days=recovery_days,
        incubation_days=incubation_days,
        ventilation_rate=ventilation_rate,
        shedding_rate=shedding_rate,
        beta_air=beta_air,
        mortality_rate=mortality_rate
    )
    
    unique_nodes = pd.unique(contacts_df[['u', 'v']].values.ravel('K'))
    initial_sample = random.sample(list(unique_nodes), patient_zero_count)
    
    start_time = contacts_df['timestamp'].iloc[0]
    
    for node in initial_sample:
        sim.node_states[node] = INFECTIOUS
        recovery_duration = sim.sample_recovery_duration()
        heapq.heappush(sim.event_queue, (start_time + recovery_duration, EVENT_RECOVER, node))
    
    initial_infected = [int(node) for node in initial_sample]
    
    yield {
        "time": int(start_time),
        "infected": initial_infected,
        "exposed": [],
        "recovered": [],
        "zone_updates": {},
        "stats": {"avg_aqi": 0.0, "total_aqi": 0.0, "contaminated_zones": 0},
        "total_exposed": 0,
        "total_infected": len(initial_infected),
        "total_recovered": 0,
        "total_dead": 0
    }
    
    grouped = contacts_df.groupby('timestamp')
    
    for timestamp, group in grouped:
        step_result = sim.step(timestamp, group)
        
        if (step_result["new_infections"] or 
            step_result["new_infected"] or 
            step_result["new_recovered"] or
            step_result["zone_updates"]):
            yield step_result
    
    last_timestamp = contacts_df['timestamp'].iloc[-1]
    time_step = 20
    max_additional_steps = 1000
    
    for _ in range(max_additional_steps):
        if not sim.event_queue:
            break
        
        last_timestamp += time_step
        step_result = sim.step(last_timestamp, pd.DataFrame(columns=['u', 'v']))
        
        if (step_result["new_infected"] or 
            step_result["new_recovered"] or
            step_result["zone_updates"]):
            yield step_result
