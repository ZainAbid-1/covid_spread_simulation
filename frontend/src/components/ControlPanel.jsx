import { Play } from 'lucide-react'

function ControlPanel({ params, setParams, onRunSimulation, loading }) {
  const handleChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) }))
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-bold mb-6 text-emerald-400">Virus Simulation Parameters</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Transmission Rate (β)
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.beta}
            onChange={(e) => handleChange('beta', e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0.0</span>
            <span className="font-bold text-emerald-400">{params.beta.toFixed(2)}</span>
            <span>1.0</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Rate of infection per contact
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Average Recovery Time (γ)
          </label>
          <input
            type="range"
            min="1"
            max="150"
            step="1"
            value={params.gamma_days}
            onChange={(e) => handleChange('gamma_days', e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1</span>
            <span className="font-bold text-cyan-400">{params.gamma_days} days (avg)</span>
            <span>150</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Mean recovery days (actual varies ±20% using normal distribution)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Initial Infections
          </label>
          <input
            type="range"
            min="1"
            max="3000"
            step="1"
            value={params.start_nodes}
            onChange={(e) => handleChange('start_nodes', e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1</span>
            <span className="font-bold text-red-400">{params.start_nodes} nodes</span>
            <span>3000</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Number of initially infected individuals
          </p>
        </div>

        <button
          onClick={onRunSimulation}
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Running...
            </>
          ) : (
            <>
              <Play size={20} />
              Run Simulation
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default ControlPanel
