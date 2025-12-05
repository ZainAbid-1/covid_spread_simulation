import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const getNodeColor = (state) => {
  switch (state) {
    case 'infected':
      return '#ef4444'; // Red-500
    case 'recovered':
      return '#3b82f6'; // Blue-500
    default:
      return '#10b981'; // Emerald-500
  }
};

const MapLayout = ({ graphData, nodeStates }) => {
  const [scaledData, setScaledData] = useState(null);

  useEffect(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      setScaledData(null);
      return;
    }

    const { nodes, links } = graphData;

    // Bounding box for Balochistan, Pakistan (largest province)
    // Covers a large area to ensure people are well-spaced and distant
    const latMin = 25.5, latMax = 31.5;
    const lonMin = 61.5, lonMax = 69.5;

    const xCoords = nodes.map(n => n.x);
    const yCoords = nodes.map(n => n.y);
    const xMin = Math.min(...xCoords), xMax = Math.max(...xCoords);
    const yMin = Math.min(...yCoords), yMax = Math.max(...yCoords);

    const scaleLat = (y) => {
        const range = yMax - yMin;
        if (range === 0) return latMin; // Avoid division by zero
        return latMin + (y - yMin) * (latMax - latMin) / range;
    }

    const scaleLon = (x) => {
        const range = xMax - xMin;
        if (range === 0) return lonMin; // Avoid division by zero
        return lonMin + (x - xMin) * (lonMax - lonMin) / range;
    }

    const scaledNodes = nodes.map(node => ({ ...node, lat: scaleLat(node.y), lon: scaleLon(node.x) }));
    const center = [scaleLat((yMin + yMax) / 2), scaleLon((xMin + xMax) / 2)];

    const scaledLinks = links.map((link, index) => {
      const source = scaledNodes.find(n => n.id === link.source.id);
      const target = scaledNodes.find(n => n.id === link.target.id);
      // Ensure both source and target are found before creating a link
      if (source && target) {
        return {
          id: index,
          positions: [[source.lat, source.lon], [target.lat, target.lon]]
        };
      }
      return null;
    }).filter(Boolean); // Filter out any null links

    setScaledData({ nodes: scaledNodes, links: scaledLinks, center });

  }, [graphData]); // Re-run this effect only when graphData changes

  // Render a placeholder or nothing until the data is scaled and ready
  if (!scaledData) {
    return (
        <div style={{ height: '100%', width: '100%', backgroundColor: '#1e293b' }} />
    );
  }

  return (
    <MapContainer 
      center={scaledData.center} 
      zoom={7} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      scrollWheelZoom={true}
      doubleClickZoom={true}
      touchZoom={true}
      dragging={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        minZoom={6}
        maxZoom={18}
      />
      {scaledData.links.map(link => (
        <Polyline
          key={link.id}
          positions={link.positions}
          color="#4b5563"
          weight={0.8}
          opacity={0.3}
          smoothFactor={1}
        />
      ))}
      {scaledData.nodes.map(node => (
        <CircleMarker
          key={node.id}
          center={[node.lat, node.lon]}
          radius={6}
          color={getNodeColor(nodeStates[node.id])}
          fillColor={getNodeColor(nodeStates[node.id])}
          fillOpacity={0.85}
          weight={2}
          opacity={1}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.9}>
            <div style={{ fontSize: '12px', fontWeight: '600' }}>
              Person {node.id}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

export default MapLayout;
