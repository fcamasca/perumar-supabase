import { useSession } from '../security/SessionProvider'

export function EnrollmentBilling({sponsor}:{sponsor:string|null}){
 const {state}=useSession()
 if(!sponsor||state.phase!=='authorized'||!state.roles?.some(r=>['DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO'].includes(r)))return null
 return <small className="enrollment-sponsor-origin">La facturación de esta matrícula es asumida por el patrocinador del Ciclo.</small>
}
