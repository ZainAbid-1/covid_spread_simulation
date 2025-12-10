import { Activity, TrendingUp, Users, Clock, Zap, Shield, AlertCircle, Wind, CloudRain } from 'lucide-react'

function Timeline({ simulationData, currentStep, isMeaslesMode = false }) {
  if (!simulationData || simulationData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Activity size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-semibold">No Simulation Data</p>
        <p className="text-sm mt-2">Run a simulation to see the timeline of events</p>
      </div>
    )
  }

  const displayData = simulationData.slice(0, currentStep + 1).reverse()
  
  const getTotalStats = () => {
    const latestStep = simulationData[currentStep] || simulationData[simulationData.length - 1]
    return {
      totalInfected: latestStep?.total_infected || 0,
      totalRecovered: latestStep?.total_recovered || 0,
      activeInfections: (latestStep?.total_infected || 0) - (latestStep?.total_recovered || 0)
    }
  }

  const stats = getTotalStats()
  const totalEvents = displayData.filter(s => 
    (s.new_infected && s.new_infected.length > 0) || 
    (s.new_recovered && s.new_recovered.length > 0)
  ).length

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString()
  }

  const getEventIcon = (step) => {
    const hasInfected = step.new_infected && step.new_infected.length > 0
    const hasRecovered = step.new_recovered && step.new_recovered.length > 0

    if (hasInfected && hasRecovered) return Activity
    if (hasInfected) return TrendingUp
    if (hasRecovered) return Users
    return Activity
  }

  const getEventColor = (step) => {
    const hasInfected = step.new_infected && step.new_infected.length > 0
    const hasRecovered = step.new_recovered && step.new_recovered.length > 0

    if (hasInfected && !hasRecovered) return 'red'
    if (hasRecovered && !hasInfected) return 'blue'
    return 'cyan'
  }

  const contactInfectionCount = isMeaslesMode ? displayData.reduce((sum, step) => {
    return sum + (step.new_infections?.filter(i => i.method === 'contact').length || 0)
  }, 0) : 0

  const airborneInfectionCount = isMeaslesMode ? displayData.reduce((sum, step) => {
    return sum + (step.new_infections?.filter(i => i.method === 'airborne').length || 0)
  }, 0) : 0

  return (
    <div className="max-h-[350px] overflow-y-auto">
      {isMeaslesMode && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-purple-400" />
              <span className="text-xs text-slate-300 font-medium">Contact</span>
            </div>
            <div className="text-lg font-bold text-purple-400">{contactInfectionCount}</div>
          </div>
          
          <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/30 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-1">
              <CloudRain size={14} className="text-pink-400" />
              <span className="text-xs text-slate-300 font-medium">Airborne</span>
            </div>
            <div className="text-lg font-bold text-pink-400">{airborneInfectionCount}</div>
          </div>
        </div>
      )}

      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">Recent Events</h3>
      </div>

      <div className="space-y-2">
        {displayData.slice(0, 5).map((step, index) => {
          const contactInfections = step.new_infections?.filter(i => i.method === 'contact') || []
          const airborneInfections = step.new_infections?.filter(i => i.method === 'airborne') || []
          const hasEvents = contactInfections.length > 0 || airborneInfections.length > 0 || 
                           (step.new_recovered && step.new_recovered.length > 0)

          if (!hasEvents && index > 0) return null

          return (
            <div
              key={`${step.time}-${index}`}
              className="bg-slate-800/60 border border-slate-700 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-300">
                  Step {displayData.length - index - 1}
                </div>
                <div className="text-xs text-slate-500">
                  {formatTime(step.time)}
                </div>
              </div>

              {isMeaslesMode ? (
                <div className="space-y-2">
                  {contactInfections.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp size={12} className="text-purple-400" />
                      <span className="text-purple-400 font-semibold">[CONTACT]</span>
                      <span className="text-slate-400">
                        {contactInfections.length} infection{contactInfections.length !== 1 ? 's' : ''} via direct contact
                      </span>
                    </div>
                  )}
                  {airborneInfections.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <CloudRain size={12} className="text-pink-400" />
                      <span className="text-pink-400 font-semibold">[AIRBORNE]</span>
                      <span className="text-slate-400">
                        {airborneInfections.length} infection{airborneInfections.length !== 1 ? 's' : ''} via viral cloud
                      </span>
                    </div>
                  )}
                  {step.new_recovered && step.new_recovered.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Shield size={12} className="text-blue-400" />
                      <span className="text-blue-400 font-semibold">[RECOVERED]</span>
                      <span className="text-slate-400">
                        {step.new_recovered.length} individual{step.new_recovered.length !== 1 ? 's' : ''} recovered
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {step.new_infected && step.new_infected.length > 0 && (
                    <div className="text-xs text-red-400">
                      +{step.new_infected.length} new infections
                    </div>
                  )}
                  {step.new_recovered && step.new_recovered.length > 0 && (
                    <div className="text-xs text-blue-400">
                      +{step.new_recovered.length} recoveries
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        }).filter(Boolean)}
      </div>
    </div>
  )
}

export default Timeline
