import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import CustomTownMap from './components/CustomTownMap'
import Statistics from './components/Statistics'
import ControlPanel from './components/ControlPanel'
import Timeline from './components/Timeline'
import NetworkGraph from './components/NetworkGraphOptimized'
import { Square, Pause, Play, Wind, Zap } from 'lucide-react'

function App() {
  const [graphData, setGraphData] = useState(null)
  
  // We use Ref for data storage to avoid constant re-renders during streaming
  const simulationDataRef = useRef([]) 
  // We still need state to trigger UI updates for stats/timeline, but we'll throttle it
  const [simulationData, setSimulationData] = useState([]) 
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false) // New: Tracks if WS is active
  const [currentStep, setCurrentStep] = useState(0)
  
  const nodeStatesRef = useRef({})
  const zoneLoadsRef = useRef({})
  
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('setup')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const wsRef = useRef(null)
  const lastStateUpdateRef = useRef(0)
  
  const [params, setParams] = useState({
    beta: 0.2,
    gamma_days: 7,
    incubation_days: 10,
    start_nodes: 5,
    ventilation_rate: 0.05,
    shedding_rate: 10.0,
    beta_air: 0.0001,
    mortality_rate: 0.0
  })

  const [liveVentilation, setLiveVentilation] = useState(0.05)
  const [airQuality, setAirQuality] = useState({ avg_aqi: 0, contaminated_zones: 0 })

  // Enhanced Speed Options
  const speedOptions = [
    { value: 1, label: '1x' },
    { value: 5, label: '5x' },
    { value: 10, label: '10x' },
    { value: 20, label: '20x' },
    { value: 50, label: '50x' },
    { value: 100, label: 'MAX' }
  ]

  useEffect(() => {
    fetchGraphData()
  }, [])

  const fetchGraphData = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/graph-data')
      const data = await response.json()
      
      const normalizedData = {
        ...data,
        nodes: data.nodes.map(node => ({
          ...node,
          id: typeof node.id === 'string' ? parseInt(node.id, 10) : node.id
        })),
        links: data.links.map(link => ({
          ...link,
          source: typeof link.source === 'string' ? parseInt(link.source, 10) : (typeof link.source === 'object' ? link.source.id : link.source),
          target: typeof link.target === 'string' ? parseInt(link.target, 10) : (typeof link.target === 'object' ? link.target.id : link.target)
        }))
      }
      
      setGraphData(normalizedData)

      const initialStates = {}
      normalizedData.nodes.forEach(node => {
        initialStates[node.id] = 'susceptible'
      })
      nodeStatesRef.current = initialStates
      
      const initialZones = {}
      for (let i = 0; i < (normalizedData.num_communities || 0); i++) {
        initialZones[i] = 0
      }
      zoneLoadsRef.current = initialZones
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching graph data:', error)
      setLoading(false)
    }
  }

  const memoizedGraphData = useMemo(() => graphData, [graphData])

  // Helper to apply a single simulation step to the Visual Refs
  const applyStepToRefs = (step) => {
    if (step.new_exposed) {
      step.new_exposed.forEach(id => { 
        const normalizedId = typeof id === 'string' ? parseInt(id, 10) : id
        nodeStatesRef.current[normalizedId] = 'exposed' 
      })
    }
    if (step.new_infected) {
      step.new_infected.forEach(id => { 
        const normalizedId = typeof id === 'string' ? parseInt(id, 10) : id
        nodeStatesRef.current[normalizedId] = 'infected' 
      })
    }
    if (step.new_recovered) {
      step.new_recovered.forEach(id => { 
        const normalizedId = typeof id === 'string' ? parseInt(id, 10) : id
        nodeStatesRef.current[normalizedId] = 'recovered' 
      })
    }
    if (step.new_dead) {
      step.new_dead.forEach(id => { 
        const normalizedId = typeof id === 'string' ? parseInt(id, 10) : id
        nodeStatesRef.current[normalizedId] = 'dead' 
      })
    }
    if (step.zone_updates) {
      zoneLoadsRef.current = { ...zoneLoadsRef.current, ...step.zone_updates }
    }
    if (step.stats) {
      setAirQuality({
        avg_aqi: step.stats.avg_aqi || 0,
        contaminated_zones: step.stats.contaminated_zones || 0
      })
    }
  }

  const runSimulation = useCallback(async () => {
    try {
      setLoading(true)
      simulationDataRef.current = []
      setSimulationData([])
      setCurrentStep(0)
      setIsPlaying(true)
      setIsStreaming(true)

      // Reset Visuals
      const resetStates = {}
      graphData?.nodes.forEach(node => { resetStates[node.id] = 'susceptible' })
      nodeStatesRef.current = resetStates

      const resetZones = {}
      for (let i = 0; i < (graphData?.num_communities || 0); i++) { resetZones[i] = 0 }
      zoneLoadsRef.current = resetZones

      if (wsRef.current) wsRef.current.close()

      const ws = new WebSocket('ws://localhost:8000/ws/simulate-measles')
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({ ...params }))
      }

      ws.onmessage = (event) => {
        const step = JSON.parse(event.data)
        
        if (step.done) {
          ws.close()
          setIsStreaming(false)
          // Sync final state
          setSimulationData([...simulationDataRef.current])
          console.log(`✅ Simulation finished: ${simulationDataRef.current.length} steps`)
          return
        }

        if (step.error) {
          console.error('Simulation error:', step.error)
          ws.close()
          setLoading(false)
          setViewMode('setup')
          return
        }

        // 1. Store Data in Ref (Fast)
        simulationDataRef.current.push(step)

        // 2. LIVE MODE: Directly update visuals without waiting for React Cycle
        applyStepToRefs(step)

        // 3. Update Progress Counters (Throttled slightly for performance if needed, but we do it live here)
        setCurrentStep(prev => prev + 1)

        // 4. Initial Setup Transition
        if (simulationDataRef.current.length === 1) {
          if (step.infected) {
             step.infected.forEach(id => {
               const normalizedId = typeof id === 'string' ? parseInt(id, 10) : id
               nodeStatesRef.current[normalizedId] = 'infected'
             })
          }
          setLoading(false)
          setViewMode('running')
        }
        
        // 5. Aggressive Throttle: Update React State every 100 steps OR every 100ms (whichever comes first)
        const now = Date.now()
        const shouldUpdateByStep = simulationDataRef.current.length % 100 === 0
        const shouldUpdateByTime = (now - lastStateUpdateRef.current) >= 100
        
        if (shouldUpdateByStep || shouldUpdateByTime) {
            setSimulationData([...simulationDataRef.current])
            lastStateUpdateRef.current = now
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        ws.close()
        setLoading(false)
        setViewMode('setup')
      }

    } catch (error) {
      console.error('Error running simulation:', error)
      setLoading(false)
    }
  }, [params, graphData])

  const stopSimulation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsPlaying(false)
    setIsStreaming(false)
    setCurrentStep(0)
    setViewMode('setup')
    
    // Reset Everything
    const resetStates = {}
    graphData?.nodes.forEach(node => { resetStates[node.id] = 'susceptible' })
    nodeStatesRef.current = resetStates
    
    const resetZones = {}
    for (let i = 0; i < (graphData?.num_communities || 0); i++) { resetZones[i] = 0 }
    zoneLoadsRef.current = resetZones
    
    setAirQuality({ avg_aqi: 0, contaminated_zones: 0 })
    simulationDataRef.current = []
    setSimulationData([])
  }, [graphData])

  const pauseSimulation = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const resumeSimulation = useCallback(() => {
    if (currentStep < simulationDataRef.current.length) {
      setIsPlaying(true)
    }
  }, [currentStep])

  // REPLAY LOGIC: Only active when NOT streaming from WebSocket (i.e. Review Mode)
  useEffect(() => {
    if (!isPlaying || isStreaming || simulationDataRef.current.length === 0) {
      return
    }

    if (currentStep >= simulationDataRef.current.length - 1) {
      setIsPlaying(false)
      return
    }

    // SPEED LOGIC:
    // If speed > 10, we process multiple steps per frame (Step Jumping)
    // This allows speeds like 50x or 100x without browser lag
    const stepsPerFrame = playbackSpeed > 10 ? Math.ceil(playbackSpeed / 5) : 1
    const delay = playbackSpeed > 10 ? 16 : (100 / playbackSpeed) // Cap at 60fps (16ms)

    const timer = setTimeout(() => {
      let nextStep = currentStep
      
      // Process batch of steps
      for (let i = 0; i < stepsPerFrame; i++) {
        if (nextStep >= simulationDataRef.current.length) break;
        
        const step = simulationDataRef.current[nextStep]
        applyStepToRefs(step) // Update visuals
        nextStep++
      }

      setCurrentStep(nextStep)
    }, delay)

    return () => clearTimeout(timer)
  }, [isPlaying, isStreaming, currentStep, playbackSpeed])

  const getStatistics = useCallback(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return {
        susceptible: 0,
        exposed: 0,
        infected: 0,
        recovered: 0,
        dead: 0
      }
    }
    
    const total = graphData.nodes.length
    const infected = Object.values(nodeStatesRef.current).filter(s => s === 'infected').length
    const exposed = Object.values(nodeStatesRef.current).filter(s => s === 'exposed').length
    const recovered = Object.values(nodeStatesRef.current).filter(s => s === 'recovered').length
    const dead = Object.values(nodeStatesRef.current).filter(s => s === 'dead').length
    
    return {
      susceptible: Math.max(0, total - infected - exposed - recovered - dead),
      exposed,
      infected,
      recovered,
      dead
    }
  }, [graphData, currentStep]) // Depend on currentStep to force refresh

  // ... (View Mode Setup is same as before) ...
  if (viewMode === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <header className="mb-8 text-center">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent mb-3">
              The Invisible Cloud
            </h1>
            <p className="text-xl text-slate-400">Measles Airborne Transmission Simulation</p>
            <p className="text-sm text-slate-500 mt-2">Spatially-Aware Environmental Memory Model</p>
          </header>

          <div className="bg-slate-800/60 backdrop-blur-lg rounded-2xl p-8 border border-slate-700 shadow-2xl">
            <ControlPanel
              params={params}
              setParams={setParams}
              onRunSimulation={runSimulation}
              loading={loading}
              isMeaslesMode={true}
            />
          </div>

          {graphData && (
            <div className="mt-6 text-center text-sm text-slate-400">
              <p>Network loaded: <span className="text-emerald-400 font-semibold">{graphData.nodes.length}</span> individuals across <span className="text-cyan-400 font-semibold">{graphData.num_communities}</span> districts</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-4">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              COMMAND CENTER
            </h1>
            <p className="text-slate-400 text-sm">Measles Environmental Monitor {isStreaming && <span className="text-emerald-400 animate-pulse ml-2">● LIVE FEED</span>}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">Air Quality Index</div>
              <div className="text-2xl font-bold text-orange-400">{airQuality.avg_aqi.toFixed(1)}</div>
            </div>
            
            <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">Contaminated Zones</div>
              <div className="text-2xl font-bold text-red-400">{airQuality.contaminated_zones}</div>
            </div>
            
            <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">Active Cases</div>
              <div className="text-2xl font-bold text-yellow-400">{getStatistics().infected}</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 h-[600px] relative">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 px-4 py-2 border-b border-slate-700 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white uppercase tracking-wider text-sm">Environmental Monitor</h3>
                  <div className="flex items-center gap-2">
                    <Wind size={16} className="text-cyan-400" />
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={liveVentilation}
                      onChange={(e) => setLiveVentilation(parseFloat(e.target.value))}
                      className="w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="text-cyan-400 text-xs font-semibold w-12">{(liveVentilation * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              <div className="pt-12 h-full">
                {!loading && memoizedGraphData && (
                  <CustomTownMap
                    graphData={memoizedGraphData}
                    nodeStatesRef={nodeStatesRef}
                    zoneLoadsRef={zoneLoadsRef}
                    isActive={true}
                    isMeaslesMode={true}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 h-[600px] relative">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-2 border-b border-slate-700 z-10">
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">Contact Tracing</h3>
              </div>
              <div className="pt-12 h-full">
                {!loading && memoizedGraphData && (
                  <NetworkGraph
                    graphData={memoizedGraphData}
                    nodeStatesRef={nodeStatesRef}
                    simulationData={simulationData}
                    currentStep={currentStep}
                    isActive={true}
                    isMeaslesMode={true}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Stats and Timeline pass simulationData (State) so they might lag slightly behind the live graph, which is fine */}
          <div className="lg:col-span-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 h-[400px] overflow-y-auto">
              <h3 className="font-bold text-white uppercase tracking-wider text-sm mb-4">Event Timeline</h3>
              <Timeline
                simulationData={simulationData}
                currentStep={currentStep}
                isMeaslesMode={true}
              />
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 h-[400px] overflow-y-auto">
              <h3 className="font-bold text-white uppercase tracking-wider text-sm mb-4">Analytics Dashboard</h3>
              <Statistics
                simulationData={simulationData}
                currentStep={currentStep}
                totalNodes={graphData?.nodes.length || 0}
                isMeaslesMode={true}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 bg-slate-800 rounded-lg p-4 border border-slate-700 flex items-center justify-between">
          <div className="flex gap-2">
            {!isStreaming && (
              isPlaying ? (
                <button
                  onClick={pauseSimulation}
                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                >
                  <Pause size={18} />
                  Pause Replay
                </button>
              ) : (
                <button
                  onClick={resumeSimulation}
                  disabled={simulationDataRef.current.length === 0}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                >
                  <Play size={18} />
                  Resume Replay
                </button>
              )
            )}
            
            {isStreaming && (
               <div className="flex items-center gap-2 bg-slate-700/50 text-slate-300 font-semibold py-2 px-4 rounded-lg border border-slate-600">
                  <Zap size={18} className="text-yellow-400 animate-pulse" />
                  Receiving Live Data...
               </div>
            )}

            <button
              onClick={stopSimulation}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
            >
              <Square size={18} />
              Stop & Reset
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              Step: {currentStep} / {simulationDataRef.current.length}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Replay Speed:</span>
              {speedOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPlaybackSpeed(option.value)}
                  disabled={isStreaming}
                  className={`py-1 px-3 rounded-lg font-semibold text-xs transition-all ${
                    playbackSpeed === option.value
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-slate-300">S: {getStatistics().susceptible}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xs text-slate-300">E: {getStatistics().exposed}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-slate-300">I: {getStatistics().infected}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs text-slate-300">R: {getStatistics().recovered}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App