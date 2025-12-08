import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { ZoomIn, ZoomOut, Maximize2, Target, Maximize } from 'lucide-react'

function NetworkGraphOptimized({ graphData, nodeStatesRef, isActive = true }) {
  const graphRef = useRef()
  const containerRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const animationFrameRef = useRef(null)
  const resizeTimerRef = useRef(null)

  useEffect(() => {
    const updateDimensions = () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current)
      }
      
      resizeTimerRef.current = setTimeout(() => {
        const container = document.getElementById('graph-container')
        if (container) {
          const width = container.offsetWidth || 800
          const height = container.offsetHeight || 600
          setDimensions({ width, height })
        }
      }, 200)
    }

    const timeoutId = setTimeout(updateDimensions, 100)
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateDimensions)
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (graphRef.current && graphData) {
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 50)
        }
      }, 500)
    }
  }, [graphData])

  const getNodeColor = useCallback((node) => {
    const state = nodeStatesRef.current[node.id] || 'susceptible'
    switch (state) {
      case 'exposed':
        return '#f59e0b'
      case 'infected':
        return '#ef4444'
      case 'recovered':
        return '#3b82f6'
      case 'susceptible':
      default:
        return '#10b981'
    }
  }, [nodeStatesRef])

  const getNodeSize = useCallback((node) => {
    const state = nodeStatesRef.current[node.id] || 'susceptible'
    if (state === 'infected') return 8
    if (state === 'exposed') return 6
    return 5
  }, [nodeStatesRef])

  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.3, 400)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 0.7, 400)
    }
  }

  const handleZoomToFit = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50)
    }
  }

  const handleGoToHotspot = () => {
    if (!graphRef.current || !graphData) return

    const infectedNodes = graphData.nodes.filter(n => nodeStatesRef.current[n.id] === 'infected')
    if (infectedNodes.length > 0) {
      const hotspot = infectedNodes[0]
      graphRef.current.centerAt(hotspot.x, hotspot.y, 1000)
      graphRef.current.zoom(3, 1000)
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

  useEffect(() => {
    if (!isActive) return

    let lastUpdate = 0
    const FPS_LIMIT = 30
    const frameDelay = 1000 / FPS_LIMIT

    const updateCanvas = (timestamp) => {
      if (timestamp - lastUpdate < frameDelay) {
        if (isActive) {
          animationFrameRef.current = requestAnimationFrame(updateCanvas)
        }
        return
      }
      
      lastUpdate = timestamp

      if (graphRef.current && isActive) {
        try {
          graphRef.current.nodeCanvasObject()
          graphRef.current.linkColor(graphRef.current.linkColor())
          graphRef.current.linkWidth(graphRef.current.linkWidth())
          graphRef.current.linkDirectionalParticles(graphRef.current.linkDirectionalParticles())
        } catch (e) {
          console.warn('Canvas update warning:', e)
        }
      }
      
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(updateCanvas)
      }
    }

    const timeoutId = setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(updateCanvas)
    }, 1000)

    return () => {
      clearTimeout(timeoutId)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive])

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Run a simulation to visualize the network
      </div>
    )
  }

  const graphDataWith2D = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }
    
    return {
      nodes: graphData.nodes.map(n => ({ ...n })),
      links: graphData.links.map(l => ({
        ...l,
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target
      }))
    }
  }, [graphData])

  const getLinkParticles = useCallback((link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source
    const targetId = typeof link.target === 'object' ? link.target.id : link.target
    
    const sourceState = nodeStatesRef.current[sourceId]
    const targetState = nodeStatesRef.current[targetId]
    
    if ((sourceState === 'infected' && targetState === 'susceptible') ||
        (targetState === 'infected' && sourceState === 'susceptible')) {
      return 2
    }
    return 0
  }, [nodeStatesRef])

  const getLinkWidth = useCallback((link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source
    const targetId = typeof link.target === 'object' ? link.target.id : link.target
    
    const sourceState = nodeStatesRef.current[sourceId]
    const targetState = nodeStatesRef.current[targetId]
    
    if ((sourceState === 'infected' && targetState === 'susceptible') ||
        (targetState === 'infected' && sourceState === 'susceptible')) {
      return 1.5
    }
    return 0.4
  }, [nodeStatesRef])

  const getLinkColor = useCallback((link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source
    const targetId = typeof link.target === 'object' ? link.target.id : link.target
    
    const sourceState = nodeStatesRef.current[sourceId]
    const targetState = nodeStatesRef.current[targetId]
    
    if ((sourceState === 'infected' && targetState === 'susceptible') ||
        (targetState === 'infected' && sourceState === 'susceptible')) {
      return 'rgba(239, 68, 68, 0.6)'
    }
    return '#334155'
  }, [nodeStatesRef])

  return (
    <div ref={containerRef} id="graph-container" className="relative w-full h-full rounded-lg overflow-hidden" style={{ minHeight: '600px', backgroundColor: '#020617' }}>
      <ForceGraph2D
        ref={graphRef}
        graphData={graphDataWith2D}
        width={dimensions.width}
        height={dimensions.height}
        nodeVal={getNodeSize}
        nodeColor={getNodeColor}
        nodeRelSize={4}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const state = nodeStatesRef.current[node.id] || 'susceptible'
          let baseSize = 5
          let color = '#10b981'
          
          if (state === 'infected') {
            baseSize = 8
            color = '#ef4444'
          } else if (state === 'exposed') {
            baseSize = 6
            color = '#f59e0b'
          } else if (state === 'recovered') {
            color = '#3b82f6'
          }
          
          const size = baseSize / globalScale
          
          ctx.beginPath()
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
          ctx.fillStyle = color
          ctx.fill()
          
          if (state === 'infected') {
            const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7
            ctx.beginPath()
            ctx.arc(node.x, node.y, (size + 2 / globalScale) * (1 + pulse * 0.3), 0, 2 * Math.PI)
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 * pulse})`
            ctx.lineWidth = 2 / globalScale
            ctx.stroke()
          }
        }}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkDirectionalParticles={getLinkParticles}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={() => '#ef4444'}
        backgroundColor="#020617"
        enableNodeDrag={false}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.4}
        warmupTicks={100}
        cooldownTicks={200}
        cooldownTime={3000}
        onEngineStop={() => {
          if (graphRef.current) {
            try {
              graphRef.current.pauseAnimation()
            } catch (e) {
              console.warn('Failed to pause animation:', e)
            }
          }
        }}
      />

      <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-4 border border-slate-800/50 shadow-xl">
        <div className="text-xs font-semibold text-slate-300 mb-3">Legend</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
            <span className="text-slate-300">Susceptible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
            <span className="text-slate-300">Exposed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full ring-2 ring-red-500/30" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-slate-300">Infected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-slate-300">Recovered</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-800/50 shadow-xl">
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-cyan-400">Tip:</span> Drag to pan | Scroll to zoom
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={handleGoToHotspot}
          className="bg-slate-900/90 backdrop-blur-sm hover:bg-red-600 text-white p-3 rounded-lg border border-slate-800/50 shadow-xl transition-all hover:scale-110"
          title="Go to Infection Hotspot"
        >
          <Target size={20} />
        </button>
        <button
          onClick={handleZoomIn}
          className="bg-slate-900/90 backdrop-blur-sm hover:bg-slate-700 text-white p-3 rounded-lg border border-slate-800/50 shadow-xl transition-all hover:scale-110"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-slate-900/90 backdrop-blur-sm hover:bg-slate-700 text-white p-3 rounded-lg border border-slate-800/50 shadow-xl transition-all hover:scale-110"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={handleZoomToFit}
          className="bg-slate-900/90 backdrop-blur-sm hover:bg-slate-700 text-white p-3 rounded-lg border border-slate-800/50 shadow-xl transition-all hover:scale-110"
          title="Reset View"
        >
          <Maximize2 size={20} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="bg-slate-900/90 backdrop-blur-sm hover:bg-emerald-600 text-white p-3 rounded-lg border border-slate-800/50 shadow-xl transition-all hover:scale-110"
          title="Toggle Fullscreen"
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  )
}

export default NetworkGraphOptimized
