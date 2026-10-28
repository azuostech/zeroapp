import AssetsPage from '@/src/modules/patrimony/presentation/AssetsPage'; export default async function Page({params}){const{id}=await params;return <AssetsPage adminViewUserId={id}/>}
