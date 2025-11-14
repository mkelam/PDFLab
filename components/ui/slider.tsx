"use client"

import * as React from "react"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min: number
  max: number
  step: number
  className?: string
}

export function Slider({
  value,
  onValueChange,
  min,
  max,
  step,
  className = ""
}: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all
        [&::-webkit-slider-thumb]:hover:bg-primary/80
        [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
        [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer
        [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:bg-primary/80
        ${className}`}
    />
  )
}
