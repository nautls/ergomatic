export class ErgomaticError extends Error {
  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, ErgomaticError.prototype);
    this.name = "ErgomaticError";
  }
}

export class ErgomaticConfigError extends ErgomaticError {
  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, ErgomaticConfigError.prototype);
    this.name = "ErgomaticConfigError";
  }
}
