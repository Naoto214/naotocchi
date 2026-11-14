export class InputGate {constructor(){this.busy=false;}async run(work){if(this.busy)return false;this.busy=true;try{await work();return true;}finally{this.busy=false;}}}
