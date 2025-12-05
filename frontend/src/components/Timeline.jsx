import { Activity, TrendingUp, Users, Clock, Zap, Shield, AlertCircle } from 'lucide-react'

function Timeline({ simulationData, currentStep }) {
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

  return (
    <div className="max-h-[600px] overflow-y-auto">
      <div className="mb-6 grid grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-red-400" />
            <span className="text-xs text-slate-300 font-medium">Total Infections</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.totalInfected}</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-blue-400" />
            <span className="text-xs text-slate-300 font-medium">Total Recovered</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{stats.totalRecovered}</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-orange-400" />
            <span className="text-xs text-slate-300 font-medium">Active Cases</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">{stats.activeInfections}</div>
        </div>
        
        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-cyan-400" />
            <span className="text-xs text-slate-300 font-medium">Total Events</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">{totalEvents}</div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Event Timeline</h3>
        <div className="text-sm text-slate-400">
          Step {currentStep} of {simulationData.length - 1}
        </div>
      </div>

      <div className="space-y-4">
        {displayData.map((step, index) => {
          const Icon = getEventIcon(step)
          const color = getEventColor(step)
          const isLatest = index === 0

          const colorClasses = {
            red: {
              bg: 'bg-red-500/20',
              border: 'border-red-500/30',
              icon: 'bg-red-500',
              text: 'text-red-400'
            },
            blue: {
              bg: 'bg-blue-500/20',
              border: 'border-blue-500/30',
              icon: 'bg-blue-500',
              text: 'text-blue-400'
            },
            cyan: {
              bg: 'bg-cyan-500/20',
              border: 'border-cyan-500/30',
              icon: 'bg-cyan-500',
              text: 'text-cyan-400'
            }
          }

          const colors = colorClasses[color]

          return (
            <div
              key={`${step.time}-${index}`}
              className={`relative ${colors.bg} border ${colors.border} rounded-lg p-4 transition-all ${
                isLatest ? 'ring-2 ring-emerald-500/50 scale-[1.02]' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`${colors.icon} rounded-full p-2 mt-1`}>
                  <Icon size={20} className="text-white" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-white">
                      {index === displayData.length - 1 ? 'Initial State' : `Event ${displayData.length - index - 1}`}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatTime(step.time)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {step.infected && step.infected.length > 0 && (
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-red-400 font-semibold text-sm">
                            Initial Infections
                          </span>
                          <span className="text-red-400 text-lg font-bold">
                            {step.infected.length}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Nodes: {step.infected.slice(0, 5).join(', ')}
                          {step.infected.length > 5 && ` +${step.infected.length - 5} more`}
                        </div>
                      </div>
                    )}

                    {step.new_infected && step.new_infected.length > 0 && (
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-red-400 font-semibold text-sm flex items-center gap-2">
                            <TrendingUp size={14} />
                            New Infections
                          </span>
                          <span className="text-red-400 text-lg font-bold">
                            +{step.new_infected.length}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Nodes: {step.new_infected.slice(0, 5).join(', ')}
                          {step.new_infected.length > 5 && ` +${step.new_infected.length - 5} more`}
                        </div>
                      </div>
                    )}

                    {step.new_recovered && step.new_recovered.length > 0 && (
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-400 font-semibold text-sm flex items-center gap-2">
                            <Shield size={14} />
                            New Recoveries
                          </span>
                          <span className="text-blue-400 text-lg font-bold">
                            +{step.new_recovered.length}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Nodes: {step.new_recovered.slice(0, 5).join(', ')}
                          {step.new_recovered.length > 5 && ` +${step.new_recovered.length - 5} more`}
                        </div>
                      </div>
                    )}

                    {step.total_infected !== undefined && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-700/50">
                        <div className="bg-red-500/10 rounded-lg p-2">
                          <div className="text-xs text-slate-400 mb-1">Cumulative Infected</div>
                          <div className="text-lg font-bold text-red-400">
                            {step.total_infected}
                          </div>
                        </div>
                        {step.total_recovered !== undefined && (
                          <div className="bg-blue-500/10 rounded-lg p-2">
                            <div className="text-xs text-slate-400 mb-1">Cumulative Recovered</div>
                            <div className="text-lg font-bold text-blue-400">
                              {step.total_recovered}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isLatest && (
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  Current
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Timeline
