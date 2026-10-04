// A deterministic 30-second score. This is sculpture choreography, not simulation.
export const FIELD_DURATION=30;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
export function fieldScore(seconds:number,rank:number){
 const t=((seconds%FIELD_DURATION)+FIELD_DURATION)%FIELD_DURATION;
 const arrival=2+clamp(rank)*3.5,departure=16+(1-clamp(rank))*3;
 const coherence=smooth((t-arrival)/6)*(1-smooth((t-departure)/6));
 const arc=t/30*Math.PI*2;
 return {t,coherence,release:smooth((t-16)/9),arc,phase:t<2?'fragmented':t<12?'aligning':t<16?'ordered':t<25?'releasing':'fragmented'};
}

/** A slow super-cycle changes the search gesture; resolved geometry stays invariant. */
export function agreementScore(seconds:number){
 const {t}=fieldScore(seconds,0);
 const trace=clamp((t-12)/3.5);
 return{trace,traceOpacity:smooth((t-12)/.6)*(1-smooth((t-15)/.6))*.65,variation:Math.sin(seconds/90*Math.PI*2)*.4};
}
