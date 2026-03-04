"use client"
import useWindowSize from 'react-use/lib/useWindowSize'
import ReactConfetti from 'react-confetti'
import React, { useEffect } from 'react'

const Confetti = () => {
  const { width, height } = useWindowSize()
  const [shouldRender, setShouldRender] = React.useState(false)
  console.log(width, height)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setShouldRender(true), [])
  return shouldRender && (
    <ReactConfetti
      width={width}
      height={height}
      recycle={false}
      numberOfPieces={500}
    />
  )
}
export default Confetti
