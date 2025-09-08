import React from 'react'
import ReactECharts from 'echarts-for-react'

interface TrendSparklineProps {
  values: number[]
}

const TrendSparkline: React.FC<TrendSparklineProps> = ({ values }) => {
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 0, right: 0, top: 10, bottom: 0 },
    xAxis: { type: 'category', show: false, data: values.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#F1A501', width: 2 },
        areaStyle: { color: 'rgba(241,165,1,0.15)' },
      },
    ],
  }
  return <ReactECharts option={option} style={{ height: 60 }} />
}

export default TrendSparkline
