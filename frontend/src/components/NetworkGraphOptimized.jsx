import { useEffect, useRef, useState, useCallback } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { ZoomIn, ZoomOut, Maximize2, Target, Maximize } from 'lucide-react'

function NetworkGraphOptimized({ graphData, nodeStates }) {
  const graphRef = useRef()
  const containerRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('graph-container')
      if (container) {
        const width = container.offsetWidth || 800
        const height = container.offsetHeight || 600
        setDimensions({ width, height })
      }
    }

    const timeoutId = setTimeout(updateDimensions, 100)
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  useEffect(() => {
    if (graphRef.current && graphData) {
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.cameraPosition({ z: 2000 }, { x: 0, y: 0, z: 0 }, 1000)
        }
      }, 500)
    }
  }, [graphData])

  const getNodeColor = useCallback((node) => {
    const state = nodeStates[node.id] || 'susceptible'
    switch (state) {
      case 'infected':
        return '#ef4444'
      case 'recovered':
        return '#3b82f6'
      case 'susceptible':
      default:
        return '#10b981'
    }
  }, [nodeStates])

  const getNodeSize = useCallback((node) => {
    const state = nodeStates[node.id] || 'susceptible'
    return state === 'infected' ? 8 : 5
  }, [nodeStates])

  const handleZoomIn = () => {
    if (graphRef.current) {
      const camera = graphRef.current.camera()
      const currentZ = camera.position.z
      graphRef.current.cameraPosition({ z: currentZ * 0.7 }, null, 400)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current) {
      const camera = graphRef.current.camera()
      const currentZ = camera.position.z
      graphRef.current.cameraPosition({ z: currentZ * 1.3 }, null, 400)
    }
  }

  const handleZoomToFit = () => {
    if (graphRef.current) {
      graphRef.current.cameraPosition({ z: 2000 }, { x: 0, y: 0, z: 0 }, 1000)
    }
  }

  const handleGoToHotspot = () => {
    if (!graphRef.current || !graphData) return

    const infectedNodes = graphData.nodes.filter(n => nodeStates[n.id] === 'infected')
    if (infectedNodes.length > 0) {
      const hotspot = infectedNodes[0]
      graphRef.current.cameraPosition(
        { x: hotspot.x, y: hotspot.y, z: 500 },
        { x: hotspot.x, y: hotspot.y, z: 0 },
        1000
      )
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Run a simulation to visualize the network
      </div>
    )
  }

  const graphDataWith3D = {
    nodes: graphData.nodes.map(n => ({ ...n, z: 0 })),
    links: graphData.links
  }

  return (
    <div ref={containerRef} id="graph-container" className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden" style={{ minHeight: '600px' }}>
      <ForceGraph3D
        ref={graphRef}
        graphData={graphDataWith3D}
        width={dimensions.width}
        height={dimensions.height}
        nodeVal={getNodeSize}
        nodeColor={getNodeColor}
        nodeRelSize={5}
        linkColor={() => '#334155'}
        linkWidth={0.3}
        linkOpacity={0.5}
        backgroundColor="#0f172a"
        enableNodeDrag={false}
        enableNavigationControls={false}
        showNavInfo={false}
        nodeThreeObject={null}
        dagMode={null}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={0}
        cooldownTicks={0}
        nodeAutoColorBy={null}
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
          <span className="font-semibold text-emerald-400">Tip:</span> Drag to rotate | Scroll to zoom | Right-click to pan
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={handleGoToHotspot}
          className="bg-slate-800/95 backdrop-blur-sm hover:bg-red-600 text-white p-3 rounded-lg border border-slate-700 shadow-xl transition-all hover:scale-110"
          title="Go to Infection Hotspot"
        >
          <Target size={20} />
        </button>
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
          title="Reset View"
        >
          <Maximize2 size={20} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="bg-slate-800/95 backdrop-blur-sm hover:bg-emerald-600 text-white p-3 rounded-lg border border-slate-700 shadow-xl transition-all hover:scale-110"
          title="Toggle Fullscreen"
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  )
}

export default NetworkGraphOptimized
