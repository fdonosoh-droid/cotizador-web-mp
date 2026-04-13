import CotizadorShell from '@/components/CotizadorShell'
import { stockRepository } from '@/lib/data'

export default async function Home() {
  const ufDelDia = await stockRepository.getUFdelDia()
  return <CotizadorShell ufDelDia={ufDelDia} />
}
