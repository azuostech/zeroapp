import DebtsPage from '@/src/modules/patrimony/presentation/DebtsPage'; export default async function Page({params}){const{id}=await params;return <DebtsPage adminViewUserId={id}/>}
