/** Subdivide triangles without discarding surface area; used to pair two glyph meshes. */
export function equalizeTriangles(values:number[],count:number){
 const triangles:number[][]=[];for(let i=0;i<values.length;i+=9)triangles.push(values.slice(i,i+9));
 if(!triangles.length||count<triangles.length)throw new Error('Invalid triangle target');
 let cursor=0;
 while(triangles.length<count){const i=cursor++%triangles.length,t=triangles[i],m=[(t[0]+t[3])/2,(t[1]+t[4])/2,(t[2]+t[5])/2];triangles[i]=[...t.slice(0,3),...m,...t.slice(6,9)];triangles.push([...m,...t.slice(3,6),...t.slice(6,9)]);}
 return new Float32Array(triangles.flat());
}
export function identityEase(a:number,b:number,t:number){const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*x*(x*(x*6-15)+10);}
/** Stable non-sequential waves; nearby pieces need not arrive together. */
export function fragmentTiming(index:number,count:number){
 const wave=(index*7)%3,offset=((index*13)%11)/11;
 return {buildStart:2+wave*6+offset*2,buildEnd:10+wave*6+offset*2,alignStart:22+offset*4,alignEnd:29+offset*4,late:index>=count-3,transitStart:44+wave*3+offset,transitEnd:57+wave*3+offset};
}
