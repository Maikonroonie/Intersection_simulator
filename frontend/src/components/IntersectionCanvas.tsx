import { useRef, useEffect, useCallback } from 'react';
import type { SimulationState, Direction, LaneType } from '../types';

interface CanvasProps {
    state: SimulationState;
}

export default function IntersectionCanvas({ state }: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const draw = useCallback(
        (ctx: CanvasRenderingContext2D, width: number, height: number) => {
            const size = Math.min(width, height);
            const cx = width / 2;
            const cy = height / 2;

            const laneW = size * 0.055;
            const roadWidth = laneW * 4;
            const halfRoad = roadWidth / 2;

            ctx.clearRect(0, 0, width, height);

            const bgGrad = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.8);
            bgGrad.addColorStop(0, '#111a25');
            bgGrad.addColorStop(1, '#0a0e16');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = 'rgba(255,255,255,0.015)';
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += 30) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let y = 0; y < height; y += 30) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }

            ctx.fillStyle = '#1a1f2e';
            ctx.fillRect(cx - halfRoad, 0, roadWidth, height);
            ctx.fillRect(0, cy - halfRoad, width, roadWidth);

            // Yellow center divider
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, cy - halfRoad); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, cy + halfRoad); ctx.lineTo(cx, height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cx - halfRoad, cy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + halfRoad, cy); ctx.lineTo(width, cy); ctx.stroke();

            // Lane dividers
            ctx.setLineDash([8, 6]);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;

            const nsLanes = [cx - halfRoad + laneW, cx - halfRoad + 2 * laneW, cx - halfRoad + 3 * laneW];
            for (const lx of nsLanes) {
                if (Math.abs(lx - cx) < 1) continue;
                ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, cy - halfRoad); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(lx, cy + halfRoad); ctx.lineTo(lx, height); ctx.stroke();
            }

            const ewLanes = [cy - halfRoad + laneW, cy - halfRoad + 2 * laneW, cy - halfRoad + 3 * laneW];
            for (const ly of ewLanes) {
                if (Math.abs(ly - cy) < 1) continue;
                ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(cx - halfRoad, ly); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + halfRoad, ly); ctx.lineTo(width, ly); ctx.stroke();
            }

            ctx.setLineDash([]);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - halfRoad, 0, roadWidth, height);
            ctx.strokeRect(0, cy - halfRoad, width, roadWidth);

            const interGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, halfRoad * 1.4);
            interGrad.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
            interGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
            ctx.fillStyle = interGrad;
            ctx.fillRect(cx - halfRoad, cy - halfRoad, roadWidth, roadWidth);

            // Stop lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx - halfRoad, cy - halfRoad); ctx.lineTo(cx + halfRoad, cy - halfRoad); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - halfRoad, cy + halfRoad); ctx.lineTo(cx + halfRoad, cy + halfRoad); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + halfRoad, cy - halfRoad); ctx.lineTo(cx + halfRoad, cy + halfRoad); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - halfRoad, cy - halfRoad); ctx.lineTo(cx - halfRoad, cy + halfRoad); ctx.stroke();

            // Lane arrows
            ctx.font = `${Math.max(8, laneW * 0.5)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255,255,255,0.12)';

            drawLaneArrow(ctx, cx - laneW * 1.5, cy - halfRoad - 20, 'S+R');
            drawLaneArrow(ctx, cx - laneW * 0.5, cy - halfRoad - 20, 'L');
            drawLaneArrow(ctx, cx + laneW * 1.5, cy + halfRoad + 20, 'S+R');
            drawLaneArrow(ctx, cx + laneW * 0.5, cy + halfRoad + 20, 'L');
            drawLaneArrow(ctx, cx + halfRoad + 35, cy - laneW * 1.5, 'S+R');
            drawLaneArrow(ctx, cx + halfRoad + 35, cy - laneW * 0.5, 'L');
            drawLaneArrow(ctx, cx - halfRoad - 35, cy + laneW * 1.5, 'S+R');
            drawLaneArrow(ctx, cx - halfRoad - 35, cy + laneW * 0.5, 'L');

            // Traffic lights on the drivers right side at their stop line
            const lightOffset = halfRoad + 20;
            drawTrafficLight(ctx, cx - lightOffset, cy - lightOffset, state.roads.north?.lightState || 'red');
            drawTrafficLight(ctx, cx + lightOffset, cy + lightOffset, state.roads.south?.lightState || 'red');
            drawTrafficLight(ctx, cx + lightOffset, cy - lightOffset, state.roads.east?.lightState || 'red');
            drawTrafficLight(ctx, cx - lightOffset, cy + lightOffset, state.roads.west?.lightState || 'red');

            // Direction labels
            ctx.font = `700 ${Math.max(12, size * 0.028)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillText('N', cx, Math.max(16, cy - size * 0.42));
            ctx.fillText('S', cx, Math.min(height - 16, cy + size * 0.42));
            ctx.fillText('E', Math.min(width - 16, cx + size * 0.42), cy);
            ctx.fillText('W', Math.max(16, cx - size * 0.42), cy);

            // Vehicles
            const vehicleSize = Math.max(6, laneW * 0.35);
            const spacing = vehicleSize * 2.5;

            drawRoadVehicles(ctx, state.roads.north, cx, cy, halfRoad, laneW, vehicleSize, spacing, 'north');
            drawRoadVehicles(ctx, state.roads.south, cx, cy, halfRoad, laneW, vehicleSize, spacing, 'south');
            drawRoadVehicles(ctx, state.roads.east, cx, cy, halfRoad, laneW, vehicleSize, spacing, 'east');
            drawRoadVehicles(ctx, state.roads.west, cx, cy, halfRoad, laneW, vehicleSize, spacing, 'west');

            ctx.font = `500 ${Math.max(10, size * 0.02)}px Inter, sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.fillText(`Step ${state.step}`, width - 14, 10);
        },
        [state],
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        draw(ctx, rect.width, rect.height);
    }, [draw]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(() => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            draw(ctx, rect.width, rect.height);
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [draw]);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}

function drawLaneArrow(ctx: CanvasRenderingContext2D, x: number, y: number, arrow: string) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillText(arrow, x, y);
}

function drawTrafficLight(ctx: CanvasRenderingContext2D, x: number, y: number, lightState: 'green' | 'red') {
    const w = 14, h = 28, r = 4;
    ctx.fillStyle = '#1e2533';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y - 6, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = lightState === 'red' ? '#ef4444' : '#3b1515';
    if (lightState === 'red') { ctx.shadowColor = 'rgba(239,68,68,0.7)'; ctx.shadowBlur = 14; }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(x, y + 6, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = lightState === 'green' ? '#22c55e' : '#132b15';
    if (lightState === 'green') { ctx.shadowColor = 'rgba(34,197,94,0.7)'; ctx.shadowBlur = 14; }
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawRoadVehicles(
    ctx: CanvasRenderingContext2D,
    road: { lanes: { type: LaneType; vehicles: { id: string; isEmergency: boolean }[] }[] } | undefined,
    cx: number, cy: number,
    halfRoad: number, laneW: number,
    vehicleSize: number, spacing: number,
    direction: Direction,
) {
    if (!road) return;

    const colors = ['#6366f1', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f59e0b', '#ec4899'];

    const laneOffset = (laneType: LaneType): number => {
        return laneType === 'left' ? 0.5 : 1.5;
    };

    road.lanes.forEach((lane) => {
        const offset = laneOffset(lane.type as LaneType);

        lane.vehicles.forEach((vehicle, vIdx) => {
            let x: number, y: number;

            if (direction === 'north') {
                x = cx - offset * laneW;
                y = cy - halfRoad - 12 - spacing * vIdx;
            } else if (direction === 'south') {
                x = cx + offset * laneW;
                y = cy + halfRoad + 12 + spacing * vIdx;
            } else if (direction === 'east') {
                x = cx + halfRoad + 12 + spacing * vIdx;
                y = cy - offset * laneW;
            } else {
                x = cx - halfRoad - 12 - spacing * vIdx;
                y = cy + offset * laneW;
            }

            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.roundRect(x - vehicleSize + 1, y - vehicleSize * 0.6 + 1, vehicleSize * 2, vehicleSize * 1.2, 2);
            ctx.fill();

            const idHash = vehicle.id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
            const colorIdx = Math.abs(idHash) % colors.length;

            if (vehicle.isEmergency) {
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = 'rgba(239,68,68,0.6)';
                ctx.shadowBlur = 8;
            } else {
                ctx.fillStyle = colors[colorIdx];
                ctx.shadowColor = `${colors[colorIdx]}44`;
                ctx.shadowBlur = 4;
            }
            ctx.beginPath();
            ctx.roundRect(x - vehicleSize, y - vehicleSize * 0.6, vehicleSize * 2, vehicleSize * 1.2, 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            const idNum = vehicle.id.replace(/\D/g, '');
            const label = vehicle.isEmergency ? 'A' : (idNum || `${vIdx + 1}`);
            const fontSize = Math.max(6, vehicleSize * 0.6);
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillText(label, x, y);
        });
    });
}
