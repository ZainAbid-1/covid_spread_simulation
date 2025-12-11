import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Target, Maximize } from 'lucide-react'
import { QuadTree, Point, Rectangle } from '../utils/QuadTree'

function CustomTownMap({ graphData, nodeStatesRef, zoneLoadsRef, isActive = true, isMeaslesMode = false }) {
  const baseLayerRef = useRef(null)
  const activeLayerRef = useRef(null)
  const heatmapLayerRef = useRef(null)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 2 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const scaledNodesRef = useRef([])
  const scaledLinksRef = useRef([])
  const nodeTreeRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const animationFrameRef = useRef(null)
  const animationTime = useRef(0)
  const resizeTimerRef = useRef(null)

  useEffect(() => {
    const updateDimensions = () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current)
      }
      
      resizeTimerRef.current = setTimeout(() => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight || 600
          })
        }
      }, 100)
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', updateDimensions)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateDimensions)
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current)
      }
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!graphData || !graphData.nodes) return

    const nodes = graphData.nodes
    const links = graphData.links

    const xCoords = nodes.map(n => n.x)
    const yCoords = nodes.map(n => n.y)
    const xMin = Math.min(...xCoords)
    const xMax = Math.max(...xCoords)
    const yMin = Math.min(...yCoords)
    const yMax = Math.max(...yCoords)

    const padding = 50
    const width = dimensions.width - padding * 2
    const height = dimensions.height - padding * 2

    const scaleX = (x) => {
      const range = xMax - xMin
      if (range === 0) return width / 2 + padding
      return ((x - xMin) / range) * width + padding
    }

    const scaleY = (y) => {
      const range = yMax - yMin
      if (range === 0) return height / 2 + padding
      return ((y - yMin) / range) * height + padding
    }

    const scaled = nodes.map(node => ({
      ...node,
      screenX: scaleX(node.x),
      screenY: scaleY(node.y)
    }))

    const scaledL = links.map(link => {
      const sourceNode = scaled.find(n => n.id === (link.source.id || link.source))
      const targetNode = scaled.find(n => n.id === (link.target.id || link.target))
      return {
        source: sourceNode,
        target: targetNode
      }
    }).filter(l => l.source && l.target)

    scaledNodesRef.current = scaled
    scaledLinksRef.current = scaledL

    const boundary = new Rectangle(
      (width + padding * 2) / 2,
      (height + padding * 2) / 2,
      (width + padding * 2) / 2,
      (height + padding * 2) / 2
    )
    const nodeTree = new QuadTree(boundary, 4)
    
    for (const node of scaled) {
      nodeTree.insert(new Point(node.screenX, node.screenY, node))
    }
    
    nodeTreeRef.current = nodeTree
    
    if (scaled.length > 0) {
      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2
      const avgX = scaled.reduce((sum, n) => sum + n.screenX, 0) / scaled.length
      const avgY = scaled.reduce((sum, n) => sum + n.screenY, 0) / scaled.length
      
      const xCoords = scaled.map(n => n.screenX)
      const yCoords = scaled.map(n => n.screenY)
      const xRange = Math.max(...xCoords) - Math.min(...xCoords)
      const yRange = Math.max(...yCoords) - Math.min(...yCoords)
      const maxRange = Math.max(xRange, yRange)
      
      const fitScale = Math.min(
        (dimensions.width - 100) / maxRange,
        (dimensions.height - 100) / maxRange,
        2
      )
      
      setTransform({
        x: centerX - avgX * fitScale,
        y: centerY - avgY * fitScale,
        scale: fitScale
      })
    }
  }, [graphData, dimensions])

  useEffect(() => {
    drawBaseLayer()
  }, [transform, dimensions])

  useEffect(() => {
    if (!isActive) return

    const animate = () => {
      animationTime.current += 1
      drawActiveLayer()
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [transform, isActive])

  useEffect(() => {
    const canvas = activeLayerRef.current
    if (!canvas) return

    const wheelHandler = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.92 : 1.08
      const newScale = Math.max(0.5, Math.min(10, transform.scale * delta))
      
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const newX = x - (x - transform.x) * (newScale / transform.scale)
      const newY = y - (y - transform.y) * (newScale / transform.scale)
      
      setTransform({ x: newX, y: newY, scale: newScale })
    }

    canvas.addEventListener('wheel', wheelHandler, { passive: false })
    
    return () => {
      canvas.removeEventListener('wheel', wheelHandler)
    }
  }, [transform])

  const getNodeColor = (state) => {
    switch (state) {
      case 'exposed': return '#f59e0b'
      case 'infected': return '#ef4444'
      case 'recovered': return '#3b82f6'
      case 'dead': return '#4b5563'
      default: return '#10b981'
    }
  }

  const drawBaseLayer = () => {
    const canvas = baseLayerRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    ctx.save()
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.scale, transform.scale)

    const centerX = -transform.x / transform.scale + (dimensions.width / transform.scale) / 2
    const centerY = -transform.y / transform.scale + (dimensions.height / transform.scale) / 2
    const halfW = (dimensions.width / transform.scale) / 2 + 50
    const halfH = (dimensions.height / transform.scale) / 2 + 50

    const viewRange = new Rectangle(centerX, centerY, halfW, halfH)

    const scaledLinks = scaledLinksRef.current
    const nodeStates = nodeStatesRef.current

    ctx.strokeStyle = '#4b5563'
    ctx.lineWidth = 0.4 / transform.scale
    
    ctx.beginPath()
    for (let i = 0; i < scaledLinks.length; i++) {
      const link = scaledLinks[i]
      if (!viewRange.contains(new Point(link.source.screenX, link.source.screenY)) && 
          !viewRange.contains(new Point(link.target.screenX, link.target.screenY))) {
        continue
      }
      
      ctx.moveTo(link.source.screenX, link.source.screenY)
      ctx.lineTo(link.target.screenX, link.target.screenY)
    }
    ctx.stroke()

    const visibleNodes = nodeTreeRef.current ? nodeTreeRef.current.query(viewRange) : []

    for (const node of visibleNodes) {
      const state = nodeStates[node.id] || 'susceptible'
      
      if (state === 'susceptible') {
        const color = getNodeColor(state)
        const size = 7

        ctx.beginPath()
        ctx.arc(node.screenX, node.screenY, size, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5 / transform.scale
        ctx.stroke()
      }
    }

    ctx.restore()
  }

  const drawHeatmapLayer = () => {
    if (!isMeaslesMode || !heatmapLayerRef.current || !zoneLoadsRef) return
    
    const canvas = heatmapLayerRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    ctx.save()
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.scale, transform.scale)

    const nodes = scaledNodesRef.current
    const zoneLoads = zoneLoadsRef.current || {}
    
    const communityNodes = {}
    nodes.forEach(node => {
      const comm = node.community || 0
      if (!communityNodes[comm]) {
        communityNodes[comm] = []
      }
      communityNodes[comm].push(node)
    })

    ctx.globalCompositeOperation = 'lighter'

    const FIXED_MAX_CAP = 1000.0

    Object.keys(zoneLoads).forEach(zoneId => {
      const load = zoneLoads[zoneId]
      if (load < 1.0) return

      const zoneNodes = communityNodes[zoneId]
      if (!zoneNodes || zoneNodes.length === 0) return

      const centerX = zoneNodes.reduce((sum, n) => sum + n.screenX, 0) / zoneNodes.length
      const centerY = zoneNodes.reduce((sum, n) => sum + n.screenY, 0) / zoneNodes.length
      
      const opacity = Math.min(load / FIXED_MAX_CAP, 1) * 0.6
      const radius = 150 + (load / FIXED_MAX_CAP) * 100
      
      const pulse = Math.sin(animationTime.current * 0.02) * 20

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + pulse)
      gradient.addColorStop(0, `rgba(255, 50, 50, ${opacity})`)
      gradient.addColorStop(0.5, `rgba(255, 100, 50, ${opacity * 0.5})`)
      gradient.addColorStop(1, 'rgba(255, 50, 50, 0)')

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius + pulse, 0, 2 * Math.PI)
      ctx.fillStyle = gradient
      ctx.fill()
    })

    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()
  }

  const drawActiveLayer = () => {
    const canvas = activeLayerRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    if (isMeaslesMode) {
      drawHeatmapLayer()
    }

    ctx.save()
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.scale, transform.scale)

    const centerX = -transform.x / transform.scale + (dimensions.width / transform.scale) / 2
    const centerY = -transform.y / transform.scale + (dimensions.height / transform.scale) / 2
    const halfW = (dimensions.width / transform.scale) / 2 + 50
    const halfH = (dimensions.height / transform.scale) / 2 + 50

    const viewRange = new Rectangle(centerX, centerY, halfW, halfH)

    const scaledLinks = scaledLinksRef.current
    const nodeStates = nodeStatesRef.current

    const activeLinks = []
    for (let i = 0; i < scaledLinks.length; i++) {
      const link = scaledLinks[i]
      if (nodeStates[link.source.id] === 'infected' && 
          nodeStates[link.target.id] === 'susceptible') {
        if (viewRange.contains(new Point(link.source.screenX, link.source.screenY)) || 
            viewRange.contains(new Point(link.target.screenX, link.target.screenY))) {
          activeLinks.push(link)
        }
      }
    }

    if (activeLinks.length > 0 && !isMeaslesMode) {
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + Math.sin(animationTime.current * 0.05) * 0.2})`
      ctx.lineWidth = 1.5 / transform.scale
      ctx.beginPath()
      for (let i = 0; i < activeLinks.length; i++) {
        const link = activeLinks[i]
        ctx.moveTo(link.source.screenX, link.source.screenY)
        ctx.lineTo(link.target.screenX, link.target.screenY)
      }
      ctx.stroke()
    }

    const visibleNodes = nodeTreeRef.current ? nodeTreeRef.current.query(viewRange) : []

    for (const node of visibleNodes) {
      const state = nodeStates[node.id] || 'susceptible'
      
      if (state === 'susceptible') continue

      const color = getNodeColor(state)
      let size = 7
      if (state === 'infected') size = 10
      else if (state === 'exposed') size = 8

      if (state === 'infected') {
        const pulse1 = size + (Math.sin(animationTime.current * 0.05) + 1) * 4
        const pulse2 = size + (Math.sin(animationTime.current * 0.05 + Math.PI) + 1) * 3
        
        ctx.beginPath()
        ctx.arc(node.screenX, node.screenY, pulse1, 0, 2 * Math.PI)
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 - (pulse1 - size) / 12})`
        ctx.lineWidth = 2 / transform.scale
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(node.screenX, node.screenY, pulse2, 0, 2 * Math.PI)
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 - (pulse2 - size) / 12})`
        ctx.lineWidth = 1.5 / transform.scale
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(node.screenX, node.screenY, size, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = state === 'infected' ? '#fff' : color
      ctx.lineWidth = 1.5 / transform.scale
      ctx.stroke()
    }

    ctx.restore()
  }

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const delta = e.deltaY > 0 ? 0.92 : 1.08
    const newScale = Math.max(0.5, Math.min(10, transform.scale * delta))
    
    const rect = activeLayerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const newX = x - (x - transform.x) * (newScale / transform.scale)
    const newY = y - (y - transform.y) * (newScale / transform.scale)
    
    setTransform({ x: newX, y: newY, scale: newScale })
  }, [transform])

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
  }, [transform])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }))
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleZoomIn = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(5, prev.scale * 1.3)
    }))
  }

  const handleZoomOut = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, prev.scale / 1.3)
    }))
  }

  const handleZoomToFit = () => {
    setTransform({ x: 0, y: 0, scale: 2 })
  }

  const handleGoToHotspot = () => {
    const infectionCounts = {}
    const scaledLinks = scaledLinksRef.current
    const nodeStates = nodeStatesRef.current
    
    for (let i = 0; i < scaledLinks.length; i++) {
      const link = scaledLinks[i]
      if (nodeStates[link.source.id] === 'infected') {
        infectionCounts[link.source.id] = (infectionCounts[link.source.id] || 0) + 1
      }
    }

    const hotspotId = Object.keys(infectionCounts).reduce((a, b) => 
      infectionCounts[a] > infectionCounts[b] ? a : b, Object.keys(infectionCounts)[0]
    )

    const scaledNodes = scaledNodesRef.current
    const hotspotNode = scaledNodes.find(n => n.id === parseInt(hotspotId))
    
    if (hotspotNode) {
      const centerX = dimensions.width / 2 - hotspotNode.screenX * transform.scale
      const centerY = dimensions.height / 2 - hotspotNode.screenY * transform.scale
      setTransform(prev => ({ ...prev, x: centerX, y: centerY, scale: 2 }))
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
        Run a simulation to visualize the town
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden" style={{ touchAction: 'none' }}>
      <canvas
        ref={baseLayerRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute top-0 left-0"
        style={{ pointerEvents: 'none' }}
      />
      {isMeaslesMode && (
        <canvas
          ref={heatmapLayerRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute top-0 left-0"
          style={{ pointerEvents: 'none' }}
        />
      )}
      <canvas
        ref={activeLayerRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="absolute top-0 left-0 cursor-grab active:cursor-grabbing"
        style={{ display: 'block' }}
      />

      <div className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur-sm rounded-lg p-4 border border-slate-700 shadow-xl">
        <div className="text-xs font-semibold text-slate-300 mb-3">Legend</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-slate-300">Susceptible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-slate-300">Exposed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/30"></div>
            <span className="text-slate-300">Infected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-slate-300">Recovered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500"></div>
            <span className="text-slate-300">Deceased</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-slate-800/95 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700 shadow-xl">
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-emerald-400">Tip:</span> Scroll to zoom | Drag to pan
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={handleGoToHotspot}
          className="bg-slate-800/95 backdrop-blur-sm hover:bg-red-600 text-white p-3 rounded-lg border border-slate-700 shadow-xl transition-all hover:scale-110"
          title="Go to Transmission Hotspot"
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
          title="Fit to Screen"
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

export default CustomTownMap
