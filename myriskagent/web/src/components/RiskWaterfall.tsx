import React from 'react'
import ReactECharts from 'echarts-for-react'

export interface WaterfallItem {
  name: string
  value: number
}

interface RiskWaterfallProps {
  items: WaterfallItem[]
  totalLabel?: string
}

function buildSeries(items: WaterfallItem[]) {
  const base: number[] = []
  const inc: number[] = []
  const dec: number[] = []
  let cumulative = 0
  for (const it of items) {
    base.push(cumulative)
    if (it.value >= 0) {
      inc.push(it.value)
      dec.push(0)
    } else {
      inc.push(0)
      dec.push(-it.value)
    }
    cumulative += it.value
  }
  const labels = items.map(i => i.name)
  return { labels, base, inc, dec, total: cumulative }
}

const RiskWaterfall: React.FC<RiskWaterfallProps> = ({ items, totalLabel = 'Total' }) => {
  const { labels, base, inc, dec, total } = buildSeries(items)
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: labels.concat([totalLabel]), axisLabel: { color: '#F1A501' } },
    yAxis: { type: 'value', axisLabel: { color: '#F1A501' } },
    legend: { textStyle: { color: '#F1A501' } },
    series: [
      { // base
        name: 'base',
        type: 'bar',
        stack: 'total',
        itemStyle: { borderColor: 'transparent', color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent', borderColor: 'transparent' } },
        data: base.concat([0]),
      },
      {
        name: 'increase',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#2e7d32' },
        data: inc.concat([0]),
      },
      {
        name: 'decrease',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#B30700' },
        data: dec.concat([0]),
      },
      {
        name: totalLabel,
        type: 'bar',
        data: new Array(labels.length).fill(0).concat([total]),
        itemStyle: { color: '#F1A501' },
      },
    ],
  }
  return <ReactECharts option={option} style={{ height: 280 }} />
}

export default RiskWaterfall
