export function ModulePlaceholder({ index }: { index: number }) {
  return <article className="moduleCard"><span>0{index}</span><h3>预留模块</h3><p>这个位置暂不定义功能，后续可以从管理配置逐步扩展。</p></article>;
}
