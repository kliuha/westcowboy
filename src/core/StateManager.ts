import { STATES } from "./types/type";

export class StateManager {
  private currentAppState: keyof typeof STATES;

  constructor() {
    this.currentAppState = STATES.INITIAL;
  }

  public getAppState(): keyof typeof STATES {
    return this.currentAppState;
  }

  public setAppState(newState: keyof typeof STATES): void {
    this.currentAppState = newState;
  }

  public onStateChange(callback: () => void): void {
    // Placeholder for state change listener logic
    // In a real implementation, you might use an event emitter or observer pattern
  }
}
