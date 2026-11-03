// Comparison only. Does not import or mutate the game clock/state.
export function daypartAt(hour,minute=0){
 if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)throw new RangeError('Invalid local time');
 return hour>=5&&hour<10?'morning':hour>=10&&hour<16?'day':hour>=16&&hour<19?'evening':'night';
}
