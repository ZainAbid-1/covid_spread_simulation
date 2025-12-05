import { useEffect, useRef, useState, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

function NetworkGraph({ graphData, nodeStates }) {
  const graphRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const animationTime = useRef(0)

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

  useEffect(() => {
    const animate = () => {
      animationTime.current += 1
      requestAnimationFrame(animate)
    }
    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom * 1.3, 400)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom / 1.3, 400)
    }
  }

  const handleZoomToFit = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 80)
    }
  }

  const nodeCanvasObject = useCallback((node, ctx) => {
    const size = getNodeSize(node)
    const color = getNodeColor(node)

    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
    ctx.fillStyle = color
    ctx.fill()

    if (nodeStates[node.id] === 'infected') {
      const pulse1 = size + (Math.sin(animationTime.current * 0.05) + 1) * 2
      const pulse2 = size + (Math.sin(animationTime.current * 0.05 + Math.PI) + 1) * 1.5
      
      ctx.beginPath()
      ctx.arc(node.x, node.y, pulse1, 0, 2 * Math.PI, false)
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.6 - (pulse1 - size) / 8})`
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(node.x, node.y, pulse2, 0, 2 * Math.PI, false)
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 - (pulse2 - size) / 8})`
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.shadowBlur = 15
      ctx.shadowColor = 'rgba(239, 68, 68, 0.8)'
      ctx.beginPath()
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
      ctx.fillStyle = color
      ctx.fill()
      ctx.shadowBlur = 0
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
        linkDirectionalParticles={useCallback(link => 
          (nodeStates[link.source.id] === 'infected' && nodeStates[link.target.id] === 'susceptible') ? 3 : 0
        , [nodeStates])}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleColor={() => 'rgba(239, 68, 68, 0.9)'}
        d3VelocityDecay={0.3}
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

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={handleZoomIn}
          className="bg-slate-800/95 backdrop-blur-sm hover:bg-slate-700 text-white p-3 rounded-lg border border-slate-700 shadow-xl transition-all hover:scale-110"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-slate-800/95 backdrop-blur-sm hover:bg-slate-700 text-white p-3 rounded-lg border border-slate-700 shadow-xl transition-all hover:scale-110"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={handleZoomToFit}
          className="bg-slate-800/95 backdrop-blur-sm hover:bg-slate-700 text-white p-3 rounded-lg border border-slate-700 shadow-xl transition-all hover:scale-110"
          title="Fit to Screen"
        >
          <Maximize2 size={20} />
        </button>
      </div>
    </div>
  )
}

export default NetworkGraph
