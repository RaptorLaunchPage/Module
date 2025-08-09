"use client"

import dynamic from 'next/dynamic'

const RaptorLanding = dynamic(() => import('./raptor/page'), { ssr: false })

export default function Home() {
  return <RaptorLanding />
}
