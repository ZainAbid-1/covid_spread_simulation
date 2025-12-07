import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    LAYOUT_ALGORITHM = os.getenv("LAYOUT_ALGORITHM", "spring_optimized")
    SPRING_ITERATIONS = int(os.getenv("SPRING_ITERATIONS", "50"))
    SPRING_K = float(os.getenv("SPRING_K", "1.5"))
    NODE_SIZE_THRESHOLD = int(os.getenv("NODE_SIZE_THRESHOLD", "5000"))
    
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
                "k": 1.5
            }
        else:
            return {
                "algorithm": Config.LAYOUT_ALGORITHM,
                "iterations": Config.SPRING_ITERATIONS,
                "k": Config.SPRING_K
            }
