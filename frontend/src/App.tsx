import { useState, useCallback, useEffect, useRef } from 'react';
import IntersectionCanvas from './components/IntersectionCanvas';
import { useSimulation } from './hooks/useSimulation';
import type { Direction } from './types';

const DIRECTION_LABELS: Record<Direction, string> = {
    north: 'N',
    south: 'S',
    east: 'E',
    west: 'W',
};

const LANE_LABELS: Record<string, string> = {
    left: 'L',
    straight_right: 'S+R',
};

export default function App() {
    const { state, addVehicle, step, reset, totalVehicles } = useSimulation();

    const [startRoad, setStartRoad] = useState<Direction>('north');
    const [endRoad, setEndRoad] = useState<Direction>('south');
    const [isEmergency, setIsEmergency] = useState(false);
    const [autoRunning, setAutoRunning] = useState(false);
    const [autoSpeed] = useState(800);
    const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoRunning && totalVehicles > 0) {
            autoRef.current = setInterval(() => step(), autoSpeed);
            return () => { if (autoRef.current) clearInterval(autoRef.current); };
        } else if (autoRunning && totalVehicles === 0) {
            setAutoRunning(false);
        }
        return () => { if (autoRef.current) clearInterval(autoRef.current); };
    }, [autoRunning, autoSpeed, step, totalVehicles]);

    const handleAddVehicle = useCallback(() => {
        if (startRoad === endRoad) return;
        addVehicle(startRoad, endRoad, isEmergency);
    }, [addVehicle, startRoad, endRoad, isEmergency]);

    const handleAddRandom = useCallback(() => {
        const dirs: Direction[] = ['north', 'south', 'east', 'west'];
        const s = dirs[Math.floor(Math.random() * 4)];
        let e = dirs[Math.floor(Math.random() * 4)];
        while (e === s) e = dirs[Math.floor(Math.random() * 4)];
        addVehicle(s, e, Math.random() < 0.1);
    }, [addVehicle]);

    const handleAddBatch = useCallback(() => {
        for (let i = 0; i < 5; i++) {
            const dirs: Direction[] = ['north', 'south', 'east', 'west'];
            const s = dirs[Math.floor(Math.random() * 4)];
            let e = dirs[Math.floor(Math.random() * 4)];
            while (e === s) e = dirs[Math.floor(Math.random() * 4)];
            addVehicle(s, e, Math.random() < 0.1);
        }
    }, [addVehicle]);

    const handleLoadJson = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                const commands = json.commands;
                if (!Array.isArray(commands)) { alert('Invalid JSON: missing "commands" array'); return; }
                reset();
                setAutoRunning(false);
                for (const cmd of commands) {
                    if (cmd.type === 'addVehicle') {
                        addVehicle(cmd.startRoad, cmd.endRoad, cmd.isEmergency ?? false, cmd.vehicleId);
                    } else if (cmd.type === 'step') {
                        step();
                    }
                }
            } catch (err) {
                alert(`JSON parse error: ${err}`);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }, [addVehicle, step, reset]);

    const handleExportJson = useCallback(() => {
        const output = {
            stepStatuses: state.log
                .slice()
                .reverse()
                .map((entry) => ({ leftVehicles: entry.leftVehicles })),
        };
        const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'simulation-output.json';
        a.click();
        URL.revokeObjectURL(url);
    }, [state.log]);

    const totalLeft = state.log.reduce((sum, l) => sum + l.leftVehicles.length, 0);

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-title">
                    <h1>Intersection Simulator</h1>
                </div>
            </header>

            <main className="app-main">
                <section className="canvas-section">
                    <div className="canvas-wrapper">
                        <IntersectionCanvas state={state} />
                    </div>
                    <div className="step-info-bar">
                        <div className="step-counter">
                            Step: <span>{state.step}</span>
                        </div>
                        <div className="phase-indicator">
                            {(['north', 'south', 'east', 'west'] as Direction[]).map((dir) => (
                                <span key={dir} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <span className={`phase-dot ${state.roads[dir]?.lightState === 'green' ? 'green' : 'red'}`} />
                                    <span style={{ fontSize: '0.7rem' }}>{dir[0].toUpperCase()}</span>
                                </span>
                            ))}
                        </div>
                        <div className="step-counter">
                            Vehicles: <span>{totalVehicles}</span> | Left: <span>{totalLeft}</span>
                        </div>
                    </div>
                </section>

                <aside className="sidebar">
                    <div className="panel">
                        <div className="panel-header">
                            <h2>Controls</h2>
                        </div>
                        <div className="panel-body">
                            <div className="controls-grid">
                                <div className="control-group">
                                    <label>From</label>
                                    <select value={startRoad} onChange={(e) => setStartRoad(e.target.value as Direction)}>
                                        <option value="north">North</option>
                                        <option value="south">South</option>
                                        <option value="east">East</option>
                                        <option value="west">West</option>
                                    </select>
                                </div>
                                <div className="control-group">
                                    <label>To</label>
                                    <select value={endRoad} onChange={(e) => setEndRoad(e.target.value as Direction)}>
                                        <option value="north">North</option>
                                        <option value="south">South</option>
                                        <option value="east">East</option>
                                        <option value="west">West</option>
                                    </select>
                                </div>

                                <div className="checkbox-row">
                                    <input type="checkbox" id="emergency" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} />
                                    <label htmlFor="emergency">Emergency Vehicle</label>
                                </div>
                                <div className="btn-row">
                                    <button className="btn btn-primary" onClick={handleAddVehicle} disabled={startRoad === endRoad}>+ Add</button>
                                    <button className="btn btn-secondary" onClick={handleAddRandom}>Random</button>
                                </div>
                                <div className="btn-row">
                                    <button className="btn btn-success" onClick={step} disabled={totalVehicles === 0}>Step</button>
                                    <button className={`btn ${autoRunning ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setAutoRunning(!autoRunning)} disabled={totalVehicles === 0 && !autoRunning}>
                                        {autoRunning ? 'Stop' : 'Auto'}
                                    </button>
                                </div>
                                <div className="btn-row">
                                    <button className="btn btn-secondary" onClick={handleAddBatch}>+5 Batch</button>
                                    <button className="btn btn-danger" onClick={() => { reset(); setAutoRunning(false); }}>Reset</button>
                                </div>
                                <div className="btn-row">
                                    <button className="btn btn-secondary" onClick={handleLoadJson}>Load JSON</button>
                                    <button className="btn btn-secondary" onClick={handleExportJson} disabled={state.log.length === 0}>Export JSON</button>
                                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="panel panel-scrollable">
                        <div className="panel-header">
                            <h2>Road Queues</h2>
                            <span className="count-badge">{totalVehicles}</span>
                        </div>
                        <div className="panel-body panel-scroll-body">
                            <div className="road-queues">
                                {(['north', 'south', 'east', 'west'] as Direction[]).map((dir) => {
                                    const road = state.roads[dir];
                                    if (!road) return null;
                                    const allVehicles = road.lanes.flatMap((l) => l.vehicles);
                                    return (
                                        <div key={dir} className={`road-queue ${road.lightState === 'green' ? 'active' : ''}`}>
                                            <div className="road-label">
                                                <span className="direction-name">{DIRECTION_LABELS[dir]}</span>
                                            </div>
                                            <span className={`road-light ${road.lightState}`} />
                                            <div className="road-vehicles">
                                                {road.lanes.map((lane) => (
                                                    lane.vehicles.length > 0 && (
                                                        <div key={lane.type} className="lane-group">
                                                            <span className="lane-tag">{LANE_LABELS[lane.type] || lane.type}</span>
                                                            {lane.vehicles.slice(0, 3).map((v) => (
                                                                <span key={v.id} className={`vehicle-chip ${v.isEmergency ? 'emergency' : ''}`}>
                                                                    {v.isEmergency ? '[A]' : ''}{v.id}
                                                                </span>
                                                            ))}
                                                            {lane.vehicles.length > 3 && <span className="vehicle-chip">+{lane.vehicles.length - 3}</span>}
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                            <span className="road-count">{allVehicles.length}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="panel panel-scrollable">
                        <div className="panel-header">
                            <h2>Step Log</h2>
                            <span className="count-badge">{state.log.length}</span>
                        </div>
                        <div className="panel-body panel-scroll-body">
                            {state.log.length === 0 ? (
                                <div className="empty-state">No steps yet. Add vehicles and press Step.</div>
                            ) : (
                                <div className="log-entries">
                                    {state.log.map((entry, i) => (
                                        <div key={i} className="log-entry">
                                            <span className="log-step">Step {entry.step}:</span>{' '}
                                            {entry.leftVehicles.length === 0 ? (
                                                <span style={{ color: 'var(--text-muted)' }}>No vehicles left</span>
                                            ) : (
                                                entry.leftVehicles.map((v, j) => (
                                                    <span key={j}>{j > 0 && ', '}<span className="log-vehicle">{v}</span></span>
                                                ))
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
