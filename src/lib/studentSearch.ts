// Quote each operand; combine words across names/documents without raw filter syntax.
export function studentSearchFilter(search: string) {
    const fields=['apellido_paterno','apellido_materno','nombres','numero_di','codigo_alumno'];
    const words=search.trim().split(/\s+/).filter(Boolean);
    return `and(${words.map(word=>`or(${fields.map(field=>`${field}.ilike.${JSON.stringify(`%${word}%`)}`).join(',')})`).join(',')})`;
}
