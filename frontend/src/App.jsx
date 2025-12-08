import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import CustomTownMap from './components/CustomTownMap'
import Statistics from './components/Statistics'
import ControlPanel from './components/ControlPanel'
import Timeline from './components/Timeline'
import NetworkGraph from './components/NetworkGraphOptimized'
import { Square, Pause, Activity, BarChart3, Map, Zap } from 'lucide-react'

function App() {
  const [graphData, setGraphData] = useState(null)
  const [simulationData, setSimulationData] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const nodeStatesRef = useRef({})
  const [loading, setLoading] = useState(true) 
  const [activeTab, setActiveTab] = useState('map')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [params, setParams] = useState({
    beta: 0.2,
    gamma_days: 2,
    incubation_days: 3,
    start_nodes: 5
  })

  const speedOptions = [
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 5, label: '5x' },
    { value: 10, label: '10x' }
  ]

  useEffect(() => {
    fetchGraphData()
  }, [])

  const fetchGraphData = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/graph-data')
      const data = await response.json()
      setGraphData(data)

      const initialStates = {}
      data.nodes.forEach(node => {
        initialStates[node.id] = 'susceptible'
      })
      nodeStatesRef.current = initialStates
      setLoading(false)
    } catch (error) {
      console.error('Error fetching graph data:', error)
      setLoading(false)
    }
  }

  const memoizedGraphData = useMemo(() => graphData, [graphData])

  const runSimulation = useCallback(async (useWebSocket = true) => {
    try {
      setLoading(true)
      setSimulationData([])
      setCurrentStep(0)
      setIsPlaying(false)

      const resetStates = {}
      graphData?.nodes.forEach(node => {
        resetStates[node.id] = 'susceptible'
      })
      nodeStatesRef.current = resetStates

      if (useWebSocket) {
        const ws = new WebSocket('ws://localhost:8000/ws/simulate')
        const streamedData = []

        ws.onopen = () => {
          ws.send(JSON.stringify({
            beta: params.beta,
            gamma_days: params.gamma_days,
            incubation_days: params.incubation_days,
            start_nodes: params.start_nodes
          }))
        }

        ws.onmessage = (event) => {
          const step = JSON.parse(event.data)
          
          if (step.done) {
            ws.close()
            console.log(`✅ Received ${streamedData.length} simulation steps via WebSocket`)
            return
          }

          if (step.error) {
            console.error('Simulation error:', step.error)
            ws.close()
            setLoading(false)
            return
          }

          streamedData.push(step)
          setSimulationData([...streamedData])

          if (streamedData.length === 1 && step.infected) {
            const newStates = { ...resetStates }
            step.infected.forEach(id => {
              newStates[id] = 'infected'
            })
            if (step.exposed) {
              step.exposed.forEach(id => {
                newStates[id] = 'exposed'
              })
            }
            nodeStatesRef.current = newStates
            setLoading(false)
            setIsPlaying(true)
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          console.log('Falling back to HTTP endpoint...')
          ws.close()
          runSimulationHTTP()
        }

        ws.onclose = () => {
          if (streamedData.length === 0) {
            console.log('WebSocket closed prematurely, using HTTP fallback')
            runSimulationHTTP()
          }
        }
      } else {
        await runSimulationHTTP()
      }
    } catch (error) {
      console.error('Error running simulation:', error)
      setLoading(false)
    }
  }, [params, graphData])

  const runSimulationHTTP = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/simulate?beta=${params.beta}&gamma_days=${params.gamma_days}&incubation_days=${params.incubation_days}&start_nodes=${params.start_nodes}`
      )
      const data = await response.json()
      setSimulationData(data)

      if (data.length > 0 && data[0].infected) {
        const newStates = {}
        graphData?.nodes.forEach(node => {
          newStates[node.id] = 'susceptible'
        })
        data[0].infected.forEach(id => {
          newStates[id] = 'infected'
        })
        nodeStatesRef.current = newStates
      }

      setLoading(false)
      setIsPlaying(true)
    } catch (error) {
      console.error('Error with HTTP simulation:', error)
      setLoading(false)
    }
  }, [params, graphData])

  const stopSimulation = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep(0)
    const resetStates = {}
    graphData?.nodes.forEach(node => {
      resetStates[node.id] = 'susceptible'
    })
    nodeStatesRef.current = resetStates
  }, [graphData])

  const pauseSimulation = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const resumeSimulation = useCallback(() => {
    if (currentStep < simulationData?.length) {
      setIsPlaying(true)
    }
  }, [currentStep, simulationData])

  useEffect(() => {
    if (!isPlaying || !simulationData || simulationData.length === 0) {
      return
    }

    if (currentStep >= simulationData.length) {
      return
    }

    const timer = setTimeout(() => {
      const step = simulationData[currentStep]

      if (step.new_exposed) {
        step.new_exposed.forEach(id => {
          nodeStatesRef.current[id] = 'exposed'
        })
      }

      if (step.new_infected) {
        step.new_infected.forEach(id => {
          nodeStatesRef.current[id] = 'infected'
        })
      }

      if (step.new_recovered) {
        step.new_recovered.forEach(id => {
          nodeStatesRef.current[id] = 'recovered'
        })
      }

      setCurrentStep(prev => prev + 1)
    }, 100 / playbackSpeed)

    return () => clearTimeout(timer)
  }, [isPlaying, currentStep, simulationData, playbackSpeed])





  const tabs = [
    { id: 'map', label: 'Town View', icon: Map },
    { id: 'network', label: 'Network Graph', icon: Zap },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'timeline', label: 'Timeline', icon: Activity }
  ]

  const getStatistics = useCallback(() => {
    if (!simulationData || currentStep === 0) return { susceptible: graphData?.nodes.length || 0, exposed: 0, infected: 0, recovered: 0 }

    const exposed = Object.values(nodeStatesRef.current).filter(s => s === 'exposed').length
    const infected = Object.values(nodeStatesRef.current).filter(s => s === 'infected').length
    const recovered = Object.values(nodeStatesRef.current).filter(s => s === 'recovered').length
    const susceptible = Object.values(nodeStatesRef.current).filter(s => s === 'susceptible').length

    return { susceptible, exposed, infected, recovered }
  }, [simulationData, currentStep, graphData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Virus Spread Simulation
          </h1>
          <p className="text-slate-400">Real-time Virus Model Visualization</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ControlPanel
              params={params}
              setParams={setParams}
              onRunSimulation={runSimulation}
              loading={loading}
            />

            {simulationData && (
              <div className="mt-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold mb-4">Playback Controls</h3>
                <div className="flex gap-2 mb-4">
                  {isPlaying ? (
                    <button
                      onClick={pauseSimulation}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
                    >
                      <Pause size={20} />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resumeSimulation}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
                    >
                      <Pause size={20} />
                      Resume
                    </button>
                  )}
                  <button
                    onClick={stopSimulation}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                  >
                    <Square size={20} />
                  </button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    Playback Speed
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {speedOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setPlaybackSpeed(option.value)}
                        className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                          playbackSpeed === option.value
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg scale-105'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-slate-400">
                  Step: {currentStep} / {simulationData.length}
                </div>
              </div>
            )}

            <div className="mt-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold mb-4">Current Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    Susceptible
                  </span>
                  <span className="font-bold text-emerald-400">{getStatistics().susceptible}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    Exposed
                  </span>
                  <span className="font-bold text-amber-400">{getStatistics().exposed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    Infected
                  </span>
                  <span className="font-bold text-red-400">{getStatistics().infected}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    Recovered
                  </span>
                  <span className="font-bold text-blue-400">{getStatistics().recovered}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div className="flex border-b border-slate-700">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-b-2 border-emerald-400 text-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <tab.icon size={20} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6 h-[600px] relative">
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 backdrop-blur-sm z-50 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
                      <p className="text-slate-400">Loading simulation data...</p>
                    </div>
                  </div>
                )}

                {activeTab === 'map' && !loading && memoizedGraphData && (
                  <div className="h-full">
                    <CustomTownMap
                      graphData={memoizedGraphData}
                      nodeStatesRef={nodeStatesRef}
                      isActive={activeTab === 'map'}
                    />
                  </div>
                )}

                {activeTab === 'network' && !loading && memoizedGraphData && (
                  <div className="h-full">
                    <NetworkGraph
                      graphData={memoizedGraphData}
                      nodeStatesRef={nodeStatesRef}
                      isActive={activeTab === 'network'}
                    />
                  </div>
                )}

                {activeTab === 'statistics' && !loading && simulationData && (
                  <div className="h-full">
                    <Statistics
                      simulationData={simulationData}
                      currentStep={currentStep}
                      totalNodes={graphData?.nodes.length || 0}
                    />
                  </div>
                )}

                {activeTab === 'timeline' && !loading && simulationData && (
                  <div className="h-full">
                    <Timeline
                      simulationData={simulationData}
                      currentStep={currentStep}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
