import ComparePage from '@/src/modules/patrimony/presentation/ComparePage'; export default async function Page({params}){const{id}=await params;return <ComparePage adminViewUserId={id}/>}
