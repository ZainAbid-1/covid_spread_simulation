import { useState, useEffect } from 'react'
import MapLayout from './components/MapLayout'
import Statistics from './components/Statistics'
import ControlPanel from './components/ControlPanel'
import Timeline from './components/Timeline'
import { Play, Pause, RotateCcw, Activity, BarChart3, Map } from 'lucide-react'

function App() {
  const [graphData, setGraphData] = useState(null)
  const [simulationData, setSimulationData] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [nodeStates, setNodeStates] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('map')
  const [params, setParams] = useState({
    beta: 0.2,
    gamma_days: 2,
    start_nodes: 5
  })

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
      setNodeStates(initialStates)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching graph data:', error)
      setLoading(false)
    }
  }

  const runSimulation = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `http://localhost:8000/simulate?beta=${params.beta}&gamma_days=${params.gamma_days}&start_nodes=${params.start_nodes}`
      )
      const data = await response.json()
      setSimulationData(data)
      setCurrentStep(0)
      setIsPlaying(false)

      if (data.length > 0 && data[0].infected) {
        const newStates = { ...nodeStates }
        Object.keys(newStates).forEach(key => {
          newStates[key] = 'susceptible'
        })
        data[0].infected.forEach(id => {
          newStates[id] = 'infected'
        })
        setNodeStates(newStates)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error running simulation:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isPlaying || !simulationData || currentStep >= simulationData.length) {
      if (currentStep >= simulationData?.length) {
        setIsPlaying(false)
      }
      return
    }

    const timer = setTimeout(() => {
      const step = simulationData[currentStep]
      const newStates = { ...nodeStates }

      if (step.new_infected) {
        step.new_infected.forEach(id => {
          newStates[id] = 'infected'
        })
      }

      if (step.new_recovered) {
        step.new_recovered.forEach(id => {
          newStates[id] = 'recovered'
        })
      }

      setNodeStates(newStates)
      setCurrentStep(prev => prev + 1)
    }, 100)

    return () => clearTimeout(timer)
  }, [isPlaying, currentStep, simulationData])

  const togglePlayPause = () => {
    if (currentStep >= simulationData?.length) {
      setCurrentStep(0)
    }
    setIsPlaying(!isPlaying)
  }

  const resetSimulation = () => {
    setIsPlaying(false)
    setCurrentStep(0)
    setSimulationData(null)
    const resetStates = {}
    graphData?.nodes.forEach(node => {
      resetStates[node.id] = 'susceptible'
    })
    setNodeStates(resetStates)
  }

  const tabs = [
    { id: 'map', label: 'Map', icon: Map },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'timeline', label: 'Timeline', icon: Activity }
  ]

  const getStatistics = () => {
    if (!simulationData || currentStep === 0) return { susceptible: graphData?.nodes.length || 0, infected: 0, recovered: 0 }

    const infected = Object.values(nodeStates).filter(s => s === 'infected').length
    const recovered = Object.values(nodeStates).filter(s => s === 'recovered').length
    const susceptible = Object.values(nodeStates).filter(s => s === 'susceptible').length

    return { susceptible, infected, recovered }
  }

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
                  <button
                    onClick={togglePlayPause}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    onClick={resetSimulation}
                    className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                  >
                    <RotateCcw size={20} />
                  </button>
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

              <div className="p-6 h-[600px]">
                {loading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
                      <p className="text-slate-400">Loading...</p>
                    </div>
                  </div>
                )}

                {!loading && activeTab === 'map' && (
                  <MapLayout
                    graphData={graphData}
                    nodeStates={nodeStates}
                  />
                )}

                {!loading && activeTab === 'statistics' && (
                  <Statistics
                    simulationData={simulationData}
                    currentStep={currentStep}
                    totalNodes={graphData?.nodes.length || 0}
                  />
                )}

                {!loading && activeTab === 'timeline' && (
                  <Timeline
                    simulationData={simulationData}
                    currentStep={currentStep}
                  />
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
