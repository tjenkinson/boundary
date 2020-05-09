import { Boundary } from './boundary';
import { CannotEnterError } from './boundary-error';

describe('Boundary', () => {
  describe('with neither onEnter or onExit', () => {
    let boundary: Boundary;
    beforeEach(() => {
      boundary = new Boundary({});
    });

    it('calls the callback immediately', () => {
      const spy = jest.fn();
      boundary.enter(spy);
      expect(spy).toBeCalledTimes(1);
    });

    it('provides the onEnter result as `undefined`', (done) => {
      boundary.enter((onEnterResult) => {
        expect(onEnterResult).toBe(undefined);
        done();
      });
    });

    it('rethrows error from callback', (done) => {
      const mockError = Symbol('mockError');
      try {
        boundary.enter(() => {
          throw mockError;
        });
      } catch (e) {
        expect(e).toBe(mockError);
        done();
      }
    });
  });

  describe('onEnter', () => {
    it('calls onEnter before the provided callback', (done) => {
      const onEnter = jest.fn();
      const boundary = new Boundary({ onEnter });
      boundary.enter(() => {
        expect(onEnter).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('calls onEnter once before multiple callbacks', (done) => {
      const onEnter = jest.fn();
      const boundary = new Boundary({ onEnter });
      boundary.enter(() => {
        boundary.enter(() => {
          expect(onEnter).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    it('calls onEnter once before each stack', () => {
      const onEnter = jest.fn();
      const boundary = new Boundary({ onEnter });
      const spy1 = jest.fn();
      const spy2 = jest.fn();
      boundary.enter(spy1);
      expect(spy1).toHaveBeenCalledTimes(1);
      expect(onEnter).toHaveBeenCalledTimes(1);
      boundary.enter(spy2);
      expect(spy2).toHaveBeenCalledTimes(1);
      expect(onEnter).toHaveBeenCalledTimes(2);
    });

    it('passes through onEnter result', (done) => {
      const mockResult = Symbol('mockResult');
      const boundary = new Boundary({ onEnter: () => mockResult });
      boundary.enter((onEnterResult) => {
        expect(onEnterResult).toBe(mockResult);
        done();
      });
    });

    it('stops on error fron onEnter', (done) => {
      const mockError = Symbol('mockError');
      const spy = jest.fn();

      const boundary = new Boundary({
        onEnter: () => {
          throw mockError;
        },
      });

      try {
        boundary.enter(spy);
      } catch (e) {
        expect(e).toBe(mockError);
        expect(spy).toBeCalledTimes(0);
        done();
      }
    });

    it('works on retry after error from onEnter', () => {
      const mockError = Symbol('mockError');
      let throwError = true;
      const spy = jest.fn();

      const boundary = new Boundary({
        onEnter: () => {
          if (throwError) {
            throw mockError;
          }
        },
      });

      try {
        boundary.enter(spy);
      } catch {}

      expect(spy).toBeCalledTimes(0);

      throwError = false;
      boundary.enter(spy);
      expect(spy).toBeCalledTimes(1);
    });

    it('throws on new entry from onEnter', () => {
      const mockResult = Symbol('mockResult');
      let nestedSuccess = false;
      const boundary = new Boundary({
        onEnter: () => {
          boundary.enter((onEnterResult) => {
            expect(onEnterResult).toBe(mockResult);
            nestedSuccess = true;
          });
        },
      });
      expect(() => boundary.enter()).toThrowError(CannotEnterError);
    });
  });

  describe('onExit', () => {
    it('calls onExit when all other callbacks have finished', () => {
      const onExitCallback = jest.fn();
      let callbacksSucceeded = false;
      const boundary = new Boundary({ onExit: onExitCallback });
      boundary.enter(() => {
        boundary.enter(() => {
          expect(onExitCallback).toHaveBeenCalledTimes(0);
          callbacksSucceeded = true;
        });
      });
      expect(callbacksSucceeded).toBe(true);
      expect(onExitCallback).toHaveBeenCalledTimes(1);
    });

    it('calls onExit after each stack', () => {
      const onExitCallback = jest.fn();
      const spy1 = jest.fn();
      const spy2 = jest.fn();
      const boundary = new Boundary({ onExit: onExitCallback });
      boundary.enter(spy1);
      expect(spy1).toHaveBeenCalledTimes(1);
      expect(onExitCallback).toHaveBeenCalledTimes(1);
      boundary.enter(spy2);
      expect(spy2).toHaveBeenCalledTimes(1);
      expect(onExitCallback).toHaveBeenCalledTimes(2);
    });

    it('provides the onEnter result as undefined', (done) => {
      const boundary = new Boundary({
        onExit: ({ onEnterResult }) => {
          expect(onEnterResult).toBe(undefined);
          done();
        },
      });

      boundary.enter(() => {});
    });

    it('provides `exceptionOccurred` as false if none occurred', (done) => {
      const boundary = new Boundary({
        onExit: ({ exceptionOccurred }) => {
          expect(exceptionOccurred).toBe(false);
          done();
        },
      });

      boundary.enter(() => {});
    });

    it('provides `exceptionOccurred` as true if one occurred and rethrows it', (done) => {
      const mockError = Symbol('mockError');
      const boundary = new Boundary({
        onExit: ({ exceptionOccurred }) => {
          expect(exceptionOccurred).toBe(true);
        },
      });

      try {
        boundary.enter(() => {
          throw mockError;
        });
      } catch (e) {
        expect(e).toBe(mockError);
        done();
      }
    });

    it('provides the exception if one occurred from retrieveException() and does not rethrow', () => {
      const mockError = Symbol('mockError');
      const boundary = new Boundary({
        onExit: ({ exceptionOccurred, retrieveException }) => {
          expect(exceptionOccurred).toBe(true);
          expect(retrieveException()).toBe(mockError);
        },
      });

      expect(() => {
        boundary.enter(() => {
          throw mockError;
        });
      }).not.toThrow();
    });

    it('rethrows the error from onExit', (done) => {
      const mockError = Symbol('mockError');
      const boundary = new Boundary({
        onExit: () => {
          throw mockError;
        },
      });

      try {
        boundary.enter(() => {
          throw mockError;
        });
      } catch (e) {
        expect(e).toBe(mockError);
        done();
      }
    });

    it('ignores the error from onExit if there was an earlier error', (done) => {
      const mockError1 = Symbol('mockError1');
      const mockError2 = Symbol('mockError2');
      const boundary = new Boundary({
        onExit: () => {
          throw mockError2;
        },
      });

      try {
        boundary.enter(() => {
          throw mockError1;
        });
      } catch (e) {
        expect(e).toBe(mockError1);
        done();
      }
    });
  });

  describe('with both onEnter and onExit', () => {
    it('supports passing nothing to enter', () => {
      const onEnterCallback = jest.fn();
      const onExitCallback = jest.fn();
      const boundary = new Boundary({
        onEnter: onEnterCallback,
        onExit: onExitCallback,
      });
      boundary.enter();
      expect(onEnterCallback).toBeCalledTimes(1);
      expect(onExitCallback).toBeCalledTimes(1);
    });

    it('provides the result from onEnter to onExit', (done) => {
      const mockResult = Symbol('mockResult');
      const boundary = new Boundary({
        onEnter: () => mockResult,
        onExit: ({ onEnterResult }) => {
          expect(onEnterResult).toBe(mockResult);
          done();
        },
      });
      boundary.enter();
    });

    it('returns `true` from inBoundary when in onEnter and callback, but not onExit', () => {
      const boundary = new Boundary({
        onEnter: () => {
          expect(boundary.inBoundary()).toBe(true);
        },
        onExit: () => {
          expect(boundary.inBoundary()).toBe(false);
        },
      });
      expect(boundary.inBoundary()).toBe(false);
      boundary.enter(() => {
        expect(boundary.inBoundary()).toBe(true);
      });
      expect(boundary.inBoundary()).toBe(false);
    });

    it('calls onEnter and onExit again when entering from onExit', () => {
      let onEnterCalls = 0;
      let onExitCalls = 0;
      const spy = jest.fn();
      const boundary = new Boundary({
        onEnter: () => onEnterCalls++,
        onExit: () => {
          onExitCalls++;
          if (onExitCalls === 1) {
            boundary.enter(spy);
          }
        },
      });
      boundary.enter();
      expect(onEnterCalls).toBe(2);
      expect(onExitCalls).toBe(2);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('passes through the return value', () => {
      const boundary = new Boundary({});
      const mockReturnValue = Symbol('mockReturnValue');
      expect(boundary.enter(() => mockReturnValue)).toBe(mockReturnValue);
    });
  });

  it('works when `enter` and `inBoundary` are assigned to variables', () => {
    let counter = 0;
    const boundary = new Boundary({ onExit: () => counter++ });
    const enter = boundary.enter;
    const inBoundary = boundary.inBoundary;
    expect(inBoundary()).toBe(false);
    enter(() => {
      expect(inBoundary()).toBe(true);
      counter++;
    });
    expect(counter).toBe(2);
  });
});
