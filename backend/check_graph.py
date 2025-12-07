import data_loader

g = data_loader.static_graph
print(f'Nodes: {len(g.nodes())}')
print(f'Edges: {len(g.edges())}')
