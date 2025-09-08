import React from 'react'
import ReactECharts from 'echarts-for-react'

interface RiskGaugeProps {
  label: string
  value: number
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ label, value }) => {
  const option = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 100,
        progress: { show: true, width: 10, itemStyle: { color: '#B30700' } },
        axisLine: { lineStyle: { width: 10, color: [[1, '#333']] } },
        pointer: { show: true },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#F1A501' },
        detail: {
          valueAnimation: true,
          formatter: '{value}',
          color: '#F1A501',
          fontSize: 20,
        },
        data: [{ value, name: label }],
        title: { color: '#F1A501', fontSize: 14 },
      },
    ],
  }
  return <ReactECharts option={option} style={{ height: 200 }} />
}

export default RiskGauge
