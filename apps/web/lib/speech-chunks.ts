// Prefer complete sentences, then clauses. Only split inside an unpunctuated
// sentence as a last resort, with a bounded request size for first-audio latency.
export function speechChunks(text:string,uniform=false):string[]{
  const chunks:string[]=[];
  let rest=text;
  while(rest.length){
    const limit=uniform?40:chunks.length?100:40;
    const hardLimit=uniform?60:chunks.length?180:100;
    if(rest.length<=limit){chunks.push(rest);break;}
    const window=rest.slice(0,limit);
    const sentence=window.match(/[。！？!?\n]|\.(?=\s|$)/);
    const clauses=[...window.matchAll(/[；;，,：:]/g)].map(match=>match.index!+1).filter(index=>index>=8);
    const nextBoundary=rest.slice(limit,hardLimit).match(/[。！？!?；;，,\n]|\.(?=\s|$)/);
    const space=window.lastIndexOf(" ");
    const cut=sentence?sentence.index!+sentence[0].length
      :clauses.length?clauses[clauses.length-1]
      :nextBoundary?limit+nextBoundary.index!+nextBoundary[0].length
      :space>=8?space+1:Math.min(rest.length,hardLimit);
    chunks.push(rest.slice(0,cut));rest=rest.slice(cut);
  }
  return chunks;
}
