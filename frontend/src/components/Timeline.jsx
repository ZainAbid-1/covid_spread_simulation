import { Activity, TrendingUp, Users } from 'lucide-react'

function Timeline({ simulationData, currentStep }) {
  if (!simulationData || simulationData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        Run a simulation to see the timeline
      </div>
    )
  }

  const displayData = simulationData.slice(0, currentStep + 1).reverse()

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

                  <div className="space-y-2">
                    {step.infected && step.infected.length > 0 && (
                      <div className="text-sm">
                        <span className="text-red-400 font-semibold">
                          Initial Infections:
                        </span>
                        <span className="text-slate-300 ml-2">
                          {step.infected.length} nodes
                        </span>
                      </div>
                    )}

                    {step.new_infected && step.new_infected.length > 0 && (
                      <div className="text-sm">
                        <span className="text-red-400 font-semibold">
                          New Infections:
                        </span>
                        <span className="text-slate-300 ml-2">
                          {step.new_infected.length} nodes
                        </span>
                      </div>
                    )}

                    {step.new_recovered && step.new_recovered.length > 0 && (
                      <div className="text-sm">
                        <span className="text-blue-400 font-semibold">
                          New Recoveries:
                        </span>
                        <span className="text-slate-300 ml-2">
                          {step.new_recovered.length} nodes
                        </span>
                      </div>
                    )}

                    {step.total_infected !== undefined && (
                      <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700/50 text-xs">
                        <div>
                          <span className="text-slate-400">Total Infected:</span>
                          <span className={`ml-2 font-bold ${colors.text}`}>
                            {step.total_infected}
                          </span>
                        </div>
                        {step.total_recovered !== undefined && (
                          <div>
                            <span className="text-slate-400">Total Recovered:</span>
                            <span className="ml-2 font-bold text-blue-400">
                              {step.total_recovered}
                            </span>
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
