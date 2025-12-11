import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function Statistics({ simulationData, currentStep, totalNodes, isMeaslesMode = false }) {
  if (!simulationData || simulationData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        Run a simulation to see statistics
      </div>
    )
  }

  const maxStep = Math.min(currentStep + 1, simulationData.length)
  const rawData = simulationData.slice(0, maxStep)
  
  const MAX_CHART_POINTS = 200
  let downsampledData = rawData
  
  if (rawData.length > MAX_CHART_POINTS) {
    const skip = Math.ceil(rawData.length / MAX_CHART_POINTS)
    downsampledData = rawData.filter((_, index) => index % skip === 0)
    
    if (downsampledData[downsampledData.length - 1] !== rawData[rawData.length - 1]) {
      downsampledData.push(rawData[rawData.length - 1])
    }
  }
  
  const chartData = downsampledData.map((step, index) => {
    const exposed = step.total_exposed || (step.exposed ? step.exposed.length : 0)
    const infected = step.total_infected || (step.infected ? step.infected.length : 0)
    const recovered = step.total_recovered || (step.recovered ? step.recovered.length : 0)
    const dead = step.total_dead || 0
    const susceptible = totalNodes - exposed - infected - recovered - dead
    const newExposures = step.new_exposed ? step.new_exposed.length : 0
    const newInfections = step.new_infected ? step.new_infected.length : 0
    const newRecoveries = step.new_recovered ? step.new_recovered.length : 0
    const newDeaths = step.new_dead ? step.new_dead.length : 0
    const activeInfections = infected - recovered
    
    const contactInfections = step.new_infections ? step.new_infections.filter(i => i.method === 'contact').length : 0
    const airborneInfections = step.new_infections ? step.new_infections.filter(i => i.method === 'airborne').length : 0
    const avgAqi = step.stats ? step.stats.avg_aqi || 0 : 0
    const contaminatedZones = step.stats ? step.stats.contaminated_zones || 0 : 0

    return {
      step: simulationData.indexOf(step),
      susceptible,
      exposed,
      infected,
      recovered,
      dead,
      activeInfections,
      newExposures,
      newInfections,
      newRecoveries,
      newDeaths,
      contactInfections,
      airborneInfections,
      avgAqi,
      contaminatedZones,
      infectionRate: newInfections > 0 && susceptible > 0 ? ((newInfections / susceptible) * 100).toFixed(2) : 0,
      time: step.time
    }
  })

  const finalStats = chartData[chartData.length - 1] || { susceptible: totalNodes, exposed: 0, infected: 0, recovered: 0 }
  const peakExposed = Math.max(...chartData.map(d => d.exposed))
  const peakInfected = Math.max(...chartData.map(d => d.infected))
  const peakActiveInfections = Math.max(...chartData.map(d => d.activeInfections))
  const totalInfections = Math.max(...chartData.map(d => d.infected))
  const reproductionRate = totalInfections > 0 ? (totalInfections / (simulationData[0]?.infected?.length || 1)).toFixed(2) : 0
  
  const infectionRateData = chartData.map(d => ({
    step: d.step,
    rate: parseFloat(d.infectionRate)
  }))

  const dailyChangesData = chartData.filter(d => d.newInfections > 0 || d.newRecoveries > 0).map(d => ({
    step: d.step,
    newInfections: d.newInfections,
    newRecoveries: d.newRecoveries
  }))
  
  if (dailyChangesData.length === 0) {
    dailyChangesData.push({ step: 0, newInfections: 0, newRecoveries: 0 })
  }

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

  const peakAqi = isMeaslesMode ? Math.max(...chartData.map(d => d.avgAqi || 0)) : 0
  const totalContactInfections = isMeaslesMode ? chartData.reduce((sum, d) => sum + (d.contactInfections || 0), 0) : 0
  const totalAirborneInfections = isMeaslesMode ? chartData.reduce((sum, d) => sum + (d.airborneInfections || 0), 0) : 0
  const totalDeaths = Math.max(...chartData.map(d => d.dead || 0))

  return (
    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
      {isMeaslesMode ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-3">
              <div className="text-xs text-orange-400 mb-1 font-semibold">Peak Air Quality Index</div>
              <div className="text-xl font-bold text-white">{peakAqi.toFixed(1)}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 rounded-lg p-3">
              <div className="text-xs text-purple-400 mb-1 font-semibold">Contact Infections</div>
              <div className="text-xl font-bold text-white">{totalContactInfections}</div>
            </div>

            <div className="bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/30 rounded-lg p-3">
              <div className="text-xs text-pink-400 mb-1 font-semibold">Airborne Infections</div>
              <div className="text-xl font-bold text-white">{totalAirborneInfections}</div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 rounded-lg p-3">
              <div className="text-xs text-cyan-400 mb-1 font-semibold">Airborne Ratio</div>
              <div className="text-xl font-bold text-white">
                {totalContactInfections + totalAirborneInfections > 0 
                  ? ((totalAirborneInfections / (totalContactInfections + totalAirborneInfections)) * 100).toFixed(0) 
                  : 0}%
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-500/20 to-slate-500/5 border border-slate-500/30 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1 font-semibold">Total Deaths</div>
              <div className="text-xl font-bold text-white">{totalDeaths}</div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2 text-slate-200">Air Quality Index Over Time</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="step" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="avgAqi"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name="Avg AQI"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2 text-slate-200">Transmission Vector Breakdown</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorContact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAirborne" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="step" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px' }} iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="contactInfections"
                  stackId="1"
                  stroke="#a855f7"
                  fillOpacity={1}
                  fill="url(#colorContact)"
                  name="Contact"
                />
                <Area
                  type="monotone"
                  dataKey="airborneInfections"
                  stackId="1"
                  stroke="#ec4899"
                  fillOpacity={1}
                  fill="url(#colorAirborne)"
                  name="Airborne"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-lg p-4">
              <div className="text-xs text-emerald-400 mb-1 font-semibold">Total Nodes</div>
              <div className="text-2xl font-bold text-white">{totalNodes}</div>
            </div>

            <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-lg p-4">
              <div className="text-xs text-amber-400 mb-1 font-semibold">Peak Exposed</div>
              <div className="text-2xl font-bold text-white">{peakExposed}</div>
              <div className="text-xs text-slate-400 mt-1">
                {((peakExposed / totalNodes) * 100).toFixed(1)}% of population
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 rounded-lg p-4">
              <div className="text-xs text-red-400 mb-1 font-semibold">Peak Infected</div>
              <div className="text-2xl font-bold text-white">{peakInfected}</div>
              <div className="text-xs text-slate-400 mt-1">
                {((peakInfected / totalNodes) * 100).toFixed(1)}% of population
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-lg p-4">
              <div className="text-xs text-blue-400 mb-1 font-semibold">Final Recovered</div>
              <div className="text-2xl font-bold text-white">{finalStats.recovered}</div>
              <div className="text-xs text-slate-400 mt-1">
                {((finalStats.recovered / totalNodes) * 100).toFixed(1)}% of population
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-4">
              <div className="text-xs text-orange-400 mb-1 font-semibold">Reproduction Rate</div>
              <div className="text-2xl font-bold text-white">{reproductionRate}</div>
              <div className="text-xs text-slate-400 mt-1">
                R₀ (Basic reproduction number)
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-slate-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Population Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorSusceptible" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExposed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInfected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDead" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4b5563" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#4b5563" stopOpacity={0}/>
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
              dataKey="exposed"
              stackId="1"
              stroke="#f59e0b"
              fillOpacity={1}
              fill="url(#colorExposed)"
              name="Exposed"
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
            <Area
              type="monotone"
              dataKey="dead"
              stackId="1"
              stroke="#4b5563"
              fillOpacity={1}
              fill="url(#colorDead)"
              name="Dead"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Active vs Total Infections</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="step" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="line" />
            <Line
              type="monotone"
              dataKey="activeInfections"
              stroke="#ef4444"
              strokeWidth={3}
              dot={false}
              name="Active Infections"
            />
            <Line
              type="monotone"
              dataKey="infected"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name="Total Infections"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Daily Changes (New Infections vs Recoveries)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyChangesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="step" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="square" />
            <Bar
              dataKey="newInfections"
              fill="#ef4444"
              name="New Infections"
            />
            <Bar
              dataKey="newRecoveries"
              fill="#3b82f6"
              name="New Recoveries"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Infection Rate Over Time (%)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={infectionRateData}>
            <defs>
              <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="step" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#f97316"
              fillOpacity={1}
              fill="url(#colorRate)"
              name="Infection Rate (%)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Statistics
