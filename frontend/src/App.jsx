import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SIRSimulation = () => {
  console.log('App component rendering');
  
  // Simulation Parameters
  const [beta, setBeta] = useState(0.2);
  const [gammaDays, setGammaDays] = useState(2);
  const [startNodes, setStartNodes] = useState(5);
  
  // Simulation State
  const [simulationData, setSimulationData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Canvas
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Fetch graph structure on mount
  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const response = await fetch('http://localhost:8000/graph-data');
      const data = await response.json();
      setGraphData(data);
    } catch (error) {
      console.error('Error fetching graph data:', error);
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    setCurrentStep(0);
    setIsPlaying(false);
    
    try {
      const response = await fetch(
        `http://localhost:8000/simulate?beta=${beta}&gamma_days=${gammaDays}&start_nodes=${startNodes}`
      );
      const data = await response.json();
      setSimulationData(data);
    } catch (error) {
      console.error('Error running simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- CRITICAL FIX HERE ---
  // Animation loop for playback
  useEffect(() => {
    // Guard clause: Stop if no data is loaded yet
    if (!simulationData) return;

    if (isPlaying && currentStep < simulationData.length - 1) {
      animationRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1000 / playbackSpeed);
    } else if (currentStep >= simulationData.length - 1) {
      setIsPlaying(false);
    }
    
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [isPlaying, currentStep, simulationData, playbackSpeed]);

  // Draw network visualization
  useEffect(() => {
    // Only return if canvas or graphData is missing. 
    // We allow drawing even if simulationData is null (start state).
    if (!canvasRef.current || !graphData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get current state
    const infectedSet = new Set();
    const recoveredSet = new Set();
    
    // Only process simulation steps if data exists
    if (simulationData) {
      for (let i = 0; i <= currentStep && i < simulationData.length; i++) {
        const step = simulationData[i];
        if (step.infected) {
          step.infected.forEach(id => infectedSet.add(id));
        }
        if (step.new_infected) {
          step.new_infected.forEach(id => infectedSet.add(id));
        }
        if (step.new_recovered) {
          step.new_recovered.forEach(id => {
            infectedSet.delete(id);
            recoveredSet.add(id);
          });
        }
      }
    }

    // Draw edges (light gray)
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    // Limit edges to improve performance
    const edgesToDraw = graphData.links.length > 5000 ? graphData.links.slice(0, 5000) : graphData.links;
    
    edgesToDraw.forEach(link => {
      const source = graphData.nodes.find(n => n.id === link.source);
      const target = graphData.nodes.find(n => n.id === link.target);
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x + width/2, source.y + height/2);
        ctx.lineTo(target.x + width/2, target.y + height/2);
        ctx.stroke();
      }
    });

    // Draw nodes
    graphData.nodes.forEach(node => {
      const x = node.x + width/2;
      const y = node.y + height/2;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      
      if (infectedSet.has(node.id)) {
        ctx.fillStyle = '#ef4444'; // Red for infected
      } else if (recoveredSet.has(node.id)) {
        ctx.fillStyle = '#22c55e'; // Green for recovered
      } else {
        ctx.fillStyle = '#3b82f6'; // Blue for susceptible
      }
      
      ctx.fill();
    });
  }, [graphData, simulationData, currentStep]);

  // Calculate statistics
  const getStatistics = () => {
    if (!simulationData || simulationData.length === 0) return null;

    const finalState = simulationData[simulationData.length - 1];
    const totalNodes = graphData?.nodes.length || 0;
    
    let maxInfected = 0;
    let peakTime = 0;
    
    simulationData.forEach(step => {
      if (step.total_infected > maxInfected) {
        maxInfected = step.total_infected;
        peakTime = step.time;
      }
    });

    const finalRecovered = finalState.total_recovered || 0;
    const finalInfected = finalState.total_infected || 0;
    const susceptible = totalNodes - finalRecovered - finalInfected;

    return {
      totalNodes,
      finalRecovered,
      finalInfected,
      susceptible,
      maxInfected,
      peakTime,
      attackRate: ((finalRecovered / totalNodes) * 100).toFixed(1)
    };
  };

  // Prepare time series data
  const getTimeSeriesData = () => {
    if (!simulationData) return [];
    
    return simulationData.map((step, idx) => ({
      step: idx,
      infected: step.total_infected || 0,
      recovered: step.total_recovered || 0,
      susceptible: (graphData?.nodes.length || 0) - (step.total_infected || 0) - (step.total_recovered || 0)
    }));
  };

  const stats = getStatistics();
  const timeSeriesData = getTimeSeriesData();

  const currentStats = simulationData && currentStep < simulationData.length
    ? simulationData[currentStep]
    : null;

  const pieData = stats ? [
    { name: 'Susceptible', value: stats.susceptible, color: '#3b82f6' },
    { name: 'Infected', value: stats.finalInfected, color: '#ef4444' },
    { name: 'Recovered', value: stats.finalRecovered, color: '#22c55e' }
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            SIR Epidemic Simulation
          </h1>
          <p className="text-slate-600">
            Interactive disease spread simulation on temporal contact networks
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-800">Simulation Parameters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Transmission Probability (β): {beta.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={beta}
                onChange={(e) => setBeta(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">Probability of infection per contact</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Recovery Time: {gammaDays} days
              </label>
              <input
                type="range"
                min="1"
                max="14"
                step="1"
                value={gammaDays}
                onChange={(e) => setGammaDays(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">Days until recovery</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Initial Infected: {startNodes}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={startNodes}
                onChange={(e) => setStartNodes(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">Number of patient zeros</p>
            </div>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </div>

        {simulationData ? (
          <>
            {/* Playback Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  
                  <button
                    onClick={() => {
                      setCurrentStep(0);
                      setIsPlaying(false);
                    }}
                    className="p-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <div className="text-sm text-slate-600">
                    Step: {currentStep + 1} / {simulationData.length}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Speed:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="5">5x</option>
                  </select>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max={simulationData.length - 1}
                value={currentStep}
                onChange={(e) => {
                  setCurrentStep(parseInt(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />

              {currentStats && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {(graphData?.nodes.length || 0) - (currentStats.total_infected || 0) - (currentStats.total_recovered || 0)}
                    </div>
                    <div className="text-xs text-slate-600">Susceptible</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {currentStats.total_infected || 0}
                    </div>
                    <div className="text-xs text-slate-600">Infected</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {currentStats.total_recovered || 0}
                    </div>
                    <div className="text-xs text-slate-600">Recovered</div>
                  </div>
                </div>
              )}
            </div>

            {/* Visualization Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Network Visualization */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Network Visualization</h3>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={400}
                  className="w-full border border-slate-200 rounded-lg"
                />
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-slate-600">Susceptible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-slate-600">Infected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-slate-600">Recovered</span>
                  </div>
                </div>
              </div>

              {/* Final State Distribution */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Final State Distribution</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Time Series Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Epidemic Progression Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="step" label={{ value: 'Time Step', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Population', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="susceptible" stroke="#3b82f6" strokeWidth={2} name="Susceptible" />
                  <Line type="monotone" dataKey="infected" stroke="#ef4444" strokeWidth={2} name="Infected" />
                  <Line type="monotone" dataKey="recovered" stroke="#22c55e" strokeWidth={2} name="Recovered" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Statistics Summary */}
            {stats && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Simulation Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1">Total Population</div>
                    <div className="text-2xl font-bold text-slate-800">{stats.totalNodes}</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1">Peak Infected</div>
                    <div className="text-2xl font-bold text-red-600">{stats.maxInfected}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1">Total Recovered</div>
                    <div className="text-2xl font-bold text-green-600">{stats.finalRecovered}</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1">Attack Rate</div>
                    <div className="text-2xl font-bold text-blue-600">{stats.attackRate}%</div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Placeholder View (When graphData exists but simulation hasn't run) */
          <div className="grid grid-cols-1 gap-6 mb-6">
             <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Network Topology</h3>
                <div className="flex justify-center items-center h-[400px]">
                   {graphData ? (
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={400}
                        className="w-full border border-slate-200 rounded-lg"
                      />
                   ) : (
                      <p className="text-slate-400">Connecting to server...</p>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SIRSimulation;