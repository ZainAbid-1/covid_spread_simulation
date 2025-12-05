import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function Statistics({ simulationData, currentStep, totalNodes }) {
  if (!simulationData || simulationData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        Run a simulation to see statistics
      </div>
    )
  }

  const chartData = simulationData.slice(0, currentStep + 1).map((step, index) => {
    const infected = step.total_infected || (step.infected ? step.infected.length : 0)
    const recovered = step.total_recovered || (step.recovered ? step.recovered.length : 0)
    const susceptible = totalNodes - infected - recovered

    return {
      step: index,
      susceptible,
      infected,
      recovered,
      time: step.time
    }
  })

  const finalStats = chartData[chartData.length - 1] || { susceptible: totalNodes, infected: 0, recovered: 0 }
  const peakInfected = Math.max(...chartData.map(d => d.infected))

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-sm font-semibold text-slate-200 mb-2">Step: {payload[0].payload.step}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-lg p-6">
          <div className="text-sm text-emerald-400 mb-1">Total Nodes</div>
          <div className="text-3xl font-bold text-white">{totalNodes}</div>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 rounded-lg p-6">
          <div className="text-sm text-red-400 mb-1">Peak Infected</div>
          <div className="text-3xl font-bold text-white">{peakInfected}</div>
          <div className="text-xs text-slate-400 mt-1">
            {((peakInfected / totalNodes) * 100).toFixed(1)}% of population
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-lg p-6">
          <div className="text-sm text-blue-400 mb-1">Final Recovered</div>
          <div className="text-3xl font-bold text-white">{finalStats.recovered}</div>
          <div className="text-xs text-slate-400 mt-1">
            {((finalStats.recovered / totalNodes) * 100).toFixed(1)}% of population
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Population Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorSusceptible" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInfected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="step" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
            <Area
              type="monotone"
              dataKey="susceptible"
              stackId="1"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorSusceptible)"
              name="Susceptible"
            />
            <Area
              type="monotone"
              dataKey="infected"
              stackId="1"
              stroke="#ef4444"
              fillOpacity={1}
              fill="url(#colorInfected)"
              name="Infected"
            />
            <Area
              type="monotone"
              dataKey="recovered"
              stackId="1"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorRecovered)"
              name="Recovered"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Active Cases Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="step" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="line" />
            <Line
              type="monotone"
              dataKey="infected"
              stroke="#ef4444"
              strokeWidth={3}
              dot={false}
              name="Infected"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Statistics
