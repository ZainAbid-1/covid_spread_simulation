import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    LAYOUT_ALGORITHM = os.getenv("LAYOUT_ALGORITHM", "spring_optimized")
    SPRING_ITERATIONS = int(os.getenv("SPRING_ITERATIONS", "50"))
    SPRING_K = float(os.getenv("SPRING_K", "2.0"))
    NODE_SIZE_THRESHOLD = int(os.getenv("NODE_SIZE_THRESHOLD", "5000"))
    
    MEASLES_VENTILATION_RATE = float(os.getenv("MEASLES_VENTILATION_RATE", "0.05"))
    MEASLES_SHEDDING_RATE = float(os.getenv("MEASLES_SHEDDING_RATE", "10.0"))
    MEASLES_BETA_AIR = float(os.getenv("MEASLES_BETA_AIR", "0.0001"))
    
    @staticmethod
    def get_layout_settings(graph_size):
        if graph_size > Config.NODE_SIZE_THRESHOLD:
            return {
                "algorithm": "spring_fast",
                "iterations": 10,
                "k": 2.0
            }
        elif graph_size > 1000:
            return {
                "algorithm": "spring_optimized",
                "iterations": 30,
                "k": 2.0
            }
        else:
            return {
                "algorithm": Config.LAYOUT_ALGORITHM,
                "iterations": Config.SPRING_ITERATIONS,
                "k": Config.SPRING_K
            }
