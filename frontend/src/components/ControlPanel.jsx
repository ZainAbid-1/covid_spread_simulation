import { Play, Wind, Droplets, CloudRain } from 'lucide-react'

function ControlPanel({ params, setParams, onRunSimulation, loading, isMeaslesMode = false }) {
  const handleChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) }))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
        {isMeaslesMode ? 'Simulation Parameters' : 'Virus Simulation Parameters'}
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300 flex items-center gap-2">
            <Droplets size={16} className="text-red-400" />
            Transmission Rate (β)
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.beta}
            onChange={(e) => handleChange('beta', e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0.0</span>
            <span className="font-bold text-red-400">{params.beta.toFixed(2)}</span>
            <span>1.0</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {isMeaslesMode ? 'Direct contact infection probability' : 'Rate of infection per contact'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Recovery Time (γ)
          </label>
          <input
            type="range"
            min="1"
            max={isMeaslesMode ? "21" : "150"}
            step="1"
            value={params.gamma_days}
            onChange={(e) => handleChange('gamma_days', e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1</span>
            <span className="font-bold text-cyan-400">{params.gamma_days} days (avg)</span>
            <span>{isMeaslesMode ? "21" : "150"}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Mean recovery days (actual varies ±20% using normal distribution)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Incubation Period (σ)
          </label>
          <input
            type="range"
            min="0"
            max="21"
            step="1"
            value={params.incubation_days}
            onChange={(e) => handleChange('incubation_days', e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0</span>
            <span className="font-bold text-amber-400">{params.incubation_days} days (avg)</span>
            <span>21</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Mean incubation period before becoming infectious (±20% variation)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Initial Infections
          </label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={params.start_nodes}
            onChange={(e) => handleChange('start_nodes', e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1</span>
            <span className="font-bold text-orange-400">{params.start_nodes} nodes</span>
            <span>100</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Number of initially infected individuals
          </p>
        </div>

        {isMeaslesMode && (
          <>
            <div className="pt-4 border-t border-slate-700">
              <h3 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                <CloudRain size={16} />
                Airborne Transmission Parameters
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300 flex items-center gap-2">
                <Wind size={16} className="text-cyan-400" />
                Ventilation Efficiency
              </label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={params.ventilation_rate}
                onChange={(e) => handleChange('ventilation_rate', e.target.value)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0%</span>
                <span className="font-bold text-cyan-400">{(params.ventilation_rate * 100).toFixed(0)}%</span>
                <span>50%</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Rate at which viral particles decay in the environment (air circulation)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Viral Shedding Rate
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={params.shedding_rate}
                onChange={(e) => handleChange('shedding_rate', e.target.value)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0</span>
                <span className="font-bold text-purple-400">{params.shedding_rate.toFixed(1)}</span>
                <span>50</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Amount of viral particles released by infected individuals per timestep
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Airborne Infectivity (β<sub>air</sub>)
              </label>
              <input
                type="range"
                min="0"
                max="0.001"
                step="0.00001"
                value={params.beta_air}
                onChange={(e) => handleChange('beta_air', e.target.value)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0</span>
                <span className="font-bold text-pink-400">{params.beta_air.toFixed(5)}</span>
                <span>0.001</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Infection probability per unit of airborne viral load
              </p>
            </div>
          </>
        )}

        <button
          onClick={onRunSimulation}
          disabled={loading}
          className="w-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 hover:from-red-600 hover:via-orange-600 hover:to-yellow-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-2xl"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Initializing...
            </>
          ) : (
            <>
              <Play size={20} />
              {isMeaslesMode ? 'INITIATE SIMULATION' : 'Run Simulation'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default ControlPanel
