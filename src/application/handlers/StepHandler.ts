import { Intersection } from '../../core/domain/entities/Intersection.js';

export class StepHandler {
    static handle(intersection: Intersection): string[] {
        return intersection.step();
    }
}
