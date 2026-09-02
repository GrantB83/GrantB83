declare module 'ical.js' {
  export function parse(input: string): any;
  
  export class Component {
    constructor(jCal: any | string, parent?: Component);
    getAllSubcomponents(name?: string): Component[];
    getFirstProperty(name: string): Property | null;
    getFirstPropertyValue(name: string): any;
  }
  
  export class Property {
    getFirstValue(): any;
  }
  
  export class Time {
    isDate: boolean;
    zone: Timezone | null;
    toString(): string;
    toJSDate(): Date;
  }
  
  export class Timezone {
    static localTimezone: Timezone;
  }
}
