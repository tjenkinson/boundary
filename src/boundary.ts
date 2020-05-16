import { CannotEnterError } from './boundary-error';
export { CannotEnterError } from './boundary-error';

export type OnEnterCallback<OnEnterReturnType> = () => OnEnterReturnType;

export type OnExitCallback<OnEnterReturnType> = (
  input: OnExitInput<OnEnterReturnType>
) => void;
export type OnExitInput<OnEnterReturnType> = {
  onEnterResult: OnEnterReturnType;
  exceptionOccurred: boolean;
  retrieveException: () => any;
};

export type EnterCallback<OnEnterReturnType, ReturnType> = (
  onEnterResult: OnEnterReturnType
) => ReturnType;

export type OnExitOptions<OnEnterReturnType> = {
  onEnter?: OnEnterCallback<OnEnterReturnType>;
  onExit?: OnExitCallback<OnEnterReturnType>;
};

type Execution<OnEnterReturnType> = {
  inOnEnter: boolean;
  onEnterResult: OnEnterReturnType;
};

/**
 * A boundary represents everything below a given point in the call stack.
 *
 * It can have an `onEnter` function which is called on entry and an `onExit`
 * function which is called on exit.
 *
 * To enter the boundry call `enter` with the function you want to run inside
 * it. On the first call to `enter` in the current stack `onEnter` will be
 * called before the provided function and `onExit` will be called after it.
 *
 * Nested `enter` calls will be called immediately.
 *
 * The function provided to `enter` will receive the return value from `onEnter`
 * as the first argument.
 *
 * `onExit` will receive the the return value from `onEnter` and also the exception
 * if one is thrown from an `enter` call. It can choose to handle it, or leave it
 * to be rethrown.
 */
export class Boundary<OnEnterReturnType = void> {
  private readonly _onEnter: OnEnterCallback<OnEnterReturnType> | null;
  private readonly _onExit: OnExitCallback<OnEnterReturnType> | null;
  private _execution: Execution<OnEnterReturnType> | null = null;

  /**
   * Takes an object with the following properties:
   * - onEnter (optional): A function that is called immediately before the boundary
   *                       is entered. It must not call `enter` on the boundary.
   * - onExit (optional): A function that is called immediately after leaving the
   *                      boundary. It receives an object that contains the following
   *                      properties:
   *                      - onEnterResult: The return value from `onEnter`.
   *                      - exceptionOccurred: `true` if an exception occured inside
   *                                           the boundary.
   *                      - retrieveException: A function that returns the exception
   *                                           that occurred. Calling this will prevent
   *                                           the exception being thrown from `enter()`.
   *                                           Rethrow it if you don't want to handle it
   *                                           yourself.
   *                      If an exception occurs inside the boundary this will still
   *                      be called, and the exception will be rethrown, unless you call
   *                      `retrieveException`.
   */
  constructor({ onEnter, onExit }: OnExitOptions<OnEnterReturnType>) {
    this.inBoundary = this.inBoundary.bind(this);
    this.enter = this.enter.bind(this);
    this._onEnter = onEnter || null;
    this._onExit = onExit || null;
  }

  /**
   * Returns `true` if called from within the boundary. This includes the `onEnter`
   * callback.
   */
  public inBoundary(): boolean {
    return !!this._execution;
  }

  /**
   * Calls the provided function after entering the boundary, if not already inside it.
   *
   * It will receive the return value from `onEnter` as the first argument.
   *
   * The return value will be passed through.
   *
   * If this is the first call to `enter()` `onEnter` will be called first and `onExit`
   * will be called when this function ends.
   */
  public enter(): void;
  public enter<T>(fn: EnterCallback<OnEnterReturnType, T>): T;
  public enter<T>(fn?: EnterCallback<OnEnterReturnType, T>): T | void {
    if (this._execution) {
      if (this._execution.inOnEnter) {
        throw CannotEnterError;
      }
      return fn ? fn(this._execution.onEnterResult) : undefined;
    }

    const execution: Execution<OnEnterReturnType> = (this._execution = {
      inOnEnter: true,
      onEnterResult: undefined as any,
    });

    if (this._onEnter) {
      try {
        // if this throws we don't consider execution as having started
        execution.onEnterResult = this._onEnter();
      } catch (e) {
        this._execution = null;
        throw e;
      }
    }
    execution.inOnEnter = false;

    let returnVal: T = undefined as any;
    let exceptionOccurred = false;
    let exception: any = undefined;
    if (fn) {
      try {
        returnVal = fn(execution.onEnterResult);
      } catch (e) {
        exceptionOccurred = true;
        exception = e;
      }
    }
    this._execution = null;

    let exceptionHandled = !exceptionOccurred;
    if (this._onExit) {
      try {
        this._onExit({
          onEnterResult: execution.onEnterResult,
          exceptionOccurred,
          retrieveException: () => {
            exceptionHandled = true;
            return exception;
          },
        });
      } catch (e) {
        if (exceptionHandled) {
          // if an error occured before onExit prioritise that one
          // (similar to how `finally` works)
          throw e;
        }
      }
    }

    if (!exceptionHandled) {
      throw exception;
    }

    return returnVal;
  }
}
