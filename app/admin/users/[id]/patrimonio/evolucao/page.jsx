import EvolutionPage from '@/src/modules/patrimony/presentation/EvolutionPage'; export default async function Page({params}){const{id}=await params;return <EvolutionPage adminViewUserId={id}/>}
