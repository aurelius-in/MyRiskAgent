import React from 'react'
import ReactECharts from 'echarts-for-react'

interface SocialEvent { date: string; count: number }
interface Props { events: SocialEvent[] }

const SocialSparkline: React.FC<Props> = ({ events }) => {
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 0, right: 0, top: 10, bottom: 0 },
    xAxis: { type: 'category', show: false, data: events.map(e => e.date) },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'line',
        data: events.map(e => e.count),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#F1A501', width: 2 },
        areaStyle: { color: 'rgba(241,165,1,0.12)' },
      },
    ],
  }
  return <ReactECharts option={option} style={{ height: 60 }} />
}

export default SocialSparkline
