[![npm version](https://badge.fury.io/js/%40tjenkinson%2Fboundary.svg)](https://badge.fury.io/js/%40tjenkinson%2Fboundary)

# Boundary

A boundary represents everything below a given point in the call stack.

It can have an `onEnter` function which is called on entry and an `onExit` function which is called on exit.

To enter the boundry call `enter` with the function you want to run inside it. On the first call to `enter` in the current stack `onEnter` will be called before the provided function and `onExit` will be called after it. You can return a value from `onEnter` which will be passed to all the `enter` and `onExit` calls. This may be `undefined` if `onEnter` throws an exception or if `onEnter` is still executing.

See https://github.com/tjenkinson/state-manager for a use case of this.

## Installation

```sh
npm install --save @tjenkinson/boundary
```

or available on JSDelivr at "https://cdn.jsdelivr.net/npm/@tjenkinson/boundary@2".

## Example

```ts
import { Boundary } from '@tjenkinson/boundary';

class Something {
  private _boundary = new Boundary({
    onEnter: () => {
      console.log('Entering...');
      return Math.random();
    },
    onExit: ({ onEnterResult }) => {
      // we know `onEnterResult` cannot be `undefined` given `onEnter` won't throw
      console.log(`Done! Random number is ${onEnterResult!}`);
    },
  });

  public doSomething(): number {
    return this._boundary.enter((randomNumber) => {
      // we know `randomNumber` cannot be `undefined` given `onEnter` doesn't
      // call `doSomething()`.
      console.log(`Something. Random number is ${randomNumber!}`);
      return randomNumber * 2;
    });
  }

  public doSomethingAndSomethingElse(): number {
    return this._boundary.enter((randomNumber) => {
      const randomTimesTwo = this._doSomething();
      console.log(`Something else. Random number is ${randomNumber!}`);
      return randomTimesTwo + 1;
    });
  }
}

const something = new Something();

something.doSomething();
// -> Entering...
// -> Something. Random number is 0.2
// -> Done! Random number is 0.2
// Return value: 0.4

something.doSomethingAndSomethingElse();
// -> Entering...
// -> Something. Random number is 0.6
// -> Something else. Random number is 0.6
// -> Done! Random number is 0.6
// Return value: 2.2
```
