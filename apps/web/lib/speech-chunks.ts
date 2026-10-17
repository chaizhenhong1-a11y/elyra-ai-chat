// Prefer complete sentences, then clauses. Only split inside an unpunctuated
// sentence as a last resort, with a bounded request size for first-audio latency.
export function speechChunks(text:string,uniform=false):string[]{
  const chunks:string[]=[];
  let rest=text;
  while(rest.length){
    if(uniform){
      // A fresh synthesis call resets prosody: keep a whole sentence together,
      // including English sentences longer than a few words.
      const hardLimit=400;
      const boundary=rest.slice(0,hardLimit).match(/[。！？!?\n]|\.(?=\s|$)/);
      let cut=boundary?boundary.index!+boundary[0].length:Math.min(rest.length,hardLimit);
      if(!boundary&&rest.length>hardLimit){
        const window=rest.slice(0,hardLimit);
        const breaks=[...window.matchAll(/[；;，,：:]/g)];
        const space=window.lastIndexOf(' ');
        cut=breaks.length?breaks[breaks.length-1].index!+1:space>0?space+1:hardLimit;
      }
      chunks.push(rest.slice(0,cut));rest=rest.slice(cut);continue;
    }
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
