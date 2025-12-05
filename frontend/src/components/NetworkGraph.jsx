import { useEffect, useRef, useState, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

function NetworkGraph({ graphData, nodeStates }) {
  const graphRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('graph-container')
      if (container) {
        setDimensions({
          width: container.offsetWidth,
          height: container.offsetHeight || 600
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    if (graphRef.current && graphData) {
      graphRef.current.d3Force('charge').strength(-150) // More repulsion
      graphRef.current.d3Force('link').distance(50)   // More space
      graphRef.current.d3Force('center').strength(0.01) // Weaker center force
      graphRef.current.d3ReheatSimulation()
    }
  }, [graphData])

  const getNodeColor = (node) => {
    const state = nodeStates[node.id] || 'susceptible'
    switch (state) {
      case 'infected':
        return '#ef4444' // Red
      case 'recovered':
        return '#3b82f6' // Blue
      case 'susceptible':
      default:
        return '#10b981' // Green
    }
  }

  const getNodeSize = (node) => {
    const state = nodeStates[node.id] || 'susceptible'
    return state === 'infected' ? 5 : 3.5
  }

  const nodeCanvasObject = useCallback((node, ctx) => {
    const size = getNodeSize(node)
    const color = getNodeColor(node)

    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
    ctx.fillStyle = color
    ctx.fill()

    // Add pulsing animation for infected nodes
    if (nodeStates[node.id] === 'infected') {
      const pulseRadius = size + (Math.sin(Date.now() / 300) + 1) * 2.5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseRadius, 0, 2 * Math.PI, false);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // Red with transparency
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [nodeStates]);

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Run a simulation to visualize the network
      </div>
    )
  }

  return (
    <div id="graph-container" className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={null}
        linkColor={() => '#334155'}
        linkWidth={0.8}
        backgroundColor="#0f172a"
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        cooldownTime={3000}
        cooldownTicks={100}
        onEngineStop={() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400, 80)
          }
        }}
        // Animate particles from infected to susceptible nodes
        linkDirectionalParticles={useCallback(link => 
          (nodeStates[link.source.id] === 'infected' && nodeStates[link.target.id] === 'susceptible') ? 1 : 0
        , [nodeStates])}
        linkDirectionalParticleSpeed={0.008}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleColor={() => 'rgba(239, 68, 68, 0.8)'}
      />

      <div className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur-sm rounded-lg p-4 border border-slate-700 shadow-xl">
        <div className="text-xs font-semibold text-slate-300 mb-3">Legend</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-slate-300">Susceptible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/30"></div>
            <span className="text-slate-300">Infected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-slate-300">Recovered</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-slate-800/95 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700 shadow-xl">
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-emerald-400">Tip:</span> Drag nodes to rearrange | Scroll to zoom | Drag background to pan
        </div>
      </div>
    </div>
  )
}

export default NetworkGraph
