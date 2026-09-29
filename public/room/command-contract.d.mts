export const COMMAND_VERSION:string;
export const examples:Record<'city'|'factory',Array<{title:string;text:string;hint:string}>>;
export type CompiledGoal={ok:true;version:string;environment:string;mode:string;inspectionOnly:boolean;groundOnly:boolean;target:string;title:string;summary:string;actions:string[];limits:string[];authority:string};
export type RejectedGoal={ok:false;error:string;code:number};
export function compileGoal(raw:unknown,environment:string):CompiledGoal|RejectedGoal;
