/**
 * A typed token identifying a service in the container. Using a distinct
 * token type (rather than raw strings) prevents accidentally resolving the
 * wrong service under a colliding string key while still keeping the
 * container implementation simple (no reflection/decorators).
 */
export interface ServiceToken<T> {
  readonly id: string;
  readonly __type?: T; // phantom field for type inference only, never assigned
}

export function createToken<T>(id: string): ServiceToken<T> {
  return { id };
}

type Factory<T> = (container: ServiceContainer) => T;

/**
 * Minimal DI container. Supports singleton registration with lazy
 * instantiation (the factory only runs on first resolve), which keeps
 * activation fast since unused services never construct their listeners.
 */
export class ServiceContainer {
  private readonly factories = new Map<string, Factory<unknown>>();
  private readonly instances = new Map<string, unknown>();

  public register<T>(token: ServiceToken<T>, factory: Factory<T>): void {
    if (this.factories.has(token.id)) {
      throw new Error(`Service already registered for token "${token.id}"`);
    }
    this.factories.set(token.id, factory as Factory<unknown>);
  }

  public resolve<T>(token: ServiceToken<T>): T {
    if (this.instances.has(token.id)) {
      return this.instances.get(token.id) as T;
    }
    const factory = this.factories.get(token.id);
    if (!factory) {
      throw new Error(`No service registered for token "${token.id}"`);
    }
    const instance = factory(this);
    this.instances.set(token.id, instance);
    return instance as T;
  }

  public has(token: ServiceToken<unknown>): boolean {
    return this.factories.has(token.id);
  }

  /** Disposes any resolved instances that implement `dispose()`. */
  public disposeAll(): void {
    for (const instance of this.instances.values()) {
      if (isDisposable(instance)) {
        instance.dispose();
      }
    }
    this.instances.clear();
  }
}

function isDisposable(value: unknown): value is { dispose: () => void } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'dispose' in value &&
    typeof (value as { dispose: unknown }).dispose === 'function'
  );
}
