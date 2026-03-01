import { Road } from '../domain/entities/Road.js';
import { SimulationConfig, DEFAULT_CONFIG } from '../domain/value-objects/SimulationConfig.js';

export class PriorityCalculator {
    /**
     * Full priority formula:
     * P_r = Σ (1 + α * t_i) * (1 + β * e_i)
     *
     * @param road - The road to calculate priority for
     * @param alpha - Weight of wait time (default 0.3)
     * @param beta - Weight of emergency priority (default 5.0)
     */
    static calculateFull(road: Road, alpha: number = 0.3, beta: number = 5.0): number {
        let priority = 0;
        for (const vehicle of road.getVehicles()) {
            const waitFactor = 1 + alpha * vehicle.waitTime;
            const emergencyFactor = 1 + beta * (vehicle.isEmergency ? 1 : 0);
            priority += waitFactor * emergencyFactor;
        }
        return priority;
    }

    /**
     * Simplified priority formula using configurable weights:
     * P_r = queueLength + waitTimeWeight × totalWaitTime + emergencyWeight × emergencyCount
     *
     * Key change: emergencyCount (number of emergency vehicles) instead of boolean.
     */
    static calculateSimplified(
        road: Road,
        config?: Partial<Pick<SimulationConfig, 'waitTimeWeight' | 'emergencyWeight'>>,
    ): number {
        const waitTimeWeight = config?.waitTimeWeight ?? DEFAULT_CONFIG.waitTimeWeight;
        const emergencyWeight = config?.emergencyWeight ?? DEFAULT_CONFIG.emergencyWeight;

        const queueLength = road.length;
        const totalWaitTime = road.getTotalWaitTime();
        const emergencyCount = road.getEmergencyCount();
        return queueLength + waitTimeWeight * totalWaitTime + emergencyWeight * emergencyCount;
    }
}
