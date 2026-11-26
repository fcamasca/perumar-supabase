export function FileTypeGlyph({kind}:{kind:'csv'|'pdf'}){
 return <g className={`export-file-icon export-file-${kind}`}><path className="export-file-paper" d="M5 2h10l5 5v15H5Z"/><path className="export-file-fold" d="M15 2v5h5Z"/><rect className="export-file-badge" x="1" y="12" width="21" height="8.5" rx="1"/><text className="export-file-text" x="11.5" y="18.8" fontSize="7.1" fontFamily="Arial, sans-serif" fontWeight="800" textAnchor="middle">{kind.toUpperCase()}</text></g>
}
export function FileTypeIcon({kind}:{kind:'csv'|'pdf'}){
 return <svg className="file-type-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><FileTypeGlyph kind={kind}/></svg>
}
