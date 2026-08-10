import { describe, expect, it } from 'vitest';
import { ServiceContainer, createToken } from '../../src/container/ServiceContainer';

describe('ServiceContainer', () => {
  it('resolves a registered singleton lazily and reuses the instance', () => {
    const container = new ServiceContainer();
    let constructionCount = 0;
    const token = createToken<{ value: number }>('test.counter');

    container.register(token, () => {
      constructionCount += 1;
      return { value: 42 };
    });

    expect(constructionCount).toBe(0);

    const first = container.resolve(token);
    const second = container.resolve(token);

    expect(first).toBe(second);
    expect(first.value).toBe(42);
    expect(constructionCount).toBe(1);
  });

  it('throws when resolving an unregistered token', () => {
    const container = new ServiceContainer();
    const token = createToken<string>('missing');

    expect(() => container.resolve(token)).toThrowError(/No service registered/);
  });

  it('throws when registering the same token twice', () => {
    const container = new ServiceContainer();
    const token = createToken<number>('dup');

    container.register(token, () => 1);

    expect(() => container.register(token, () => 2)).toThrowError(/already registered/);
  });

  it('allows a factory to resolve other services from the container', () => {
    const container = new ServiceContainer();
    const a = createToken<number>('a');
    const b = createToken<number>('b');

    container.register(a, () => 10);
    container.register(b, (c) => c.resolve(a) * 2);

    expect(container.resolve(b)).toBe(20);
  });

  it('disposes all resolved instances that implement dispose()', () => {
    const container = new ServiceContainer();
    const token = createToken<{ dispose: () => void; disposed: boolean }>('disposable');
    const obj = {
      disposed: false,
      dispose(): void {
        obj.disposed = true;
      },
    };

    container.register(token, () => obj);
    container.resolve(token);
    container.disposeAll();

    expect(obj.disposed).toBe(true);
  });

  it('does not construct services that are never resolved', () => {
    const container = new ServiceContainer();
    let constructed = false;
    const token = createToken<void>('unused');

    container.register(token, () => {
      constructed = true;
    });

    expect(constructed).toBe(false);
  });
});
