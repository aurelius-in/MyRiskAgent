import React from 'react'
import { AppBar, Box, CssBaseline, Tab, Tabs, Toolbar, Typography } from '@mui/material'
import Overview from './pages/Overview'

function a11yProps(index: number) {
  return {
    id: `mra-tab-${index}`,
    'aria-controls': `mra-tabpanel-${index}`,
  }
}

const App: React.FC = () => {
  const [tab, setTab] = React.useState(0)

  return (
    <Box sx={{ bgcolor: 'black', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="static" sx={{ bgcolor: '#000000', borderBottom: '1px solid #B30700' }}>
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, color: '#F1A501', fontFamily: 'Special Elite, serif' }}
          >
            <span style={{ fontFamily: 'Arial, sans-serif' }}>My</span>
            <span style={{ color: '#B30700', margin: '0 6px' }}>Risk</span>
            <span style={{ fontFamily: 'Arial, sans-serif' }}>Agent</span>
          </Typography>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: '#F1A501' } }}
          >
            <Tab label="Overview" {...a11yProps(0)} sx={{ color: '#F1A501' }} />
            <Tab label="Scores" {...a11yProps(1)} sx={{ color: '#F1A501' }} />
            <Tab label="Drivers" {...a11yProps(2)} sx={{ color: '#F1A501' }} />
            <Tab label="Documents" {...a11yProps(3)} sx={{ color: '#F1A501' }} />
            <Tab label="Ask" {...a11yProps(4)} sx={{ color: '#F1A501' }} />
          </Tabs>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2 }}>
        {tab === 0 && <Overview />}
        {tab === 1 && <div style={{ color: '#F1A501' }}>Scores coming soon.</div>}
        {tab === 2 && <div style={{ color: '#F1A501' }}>Drivers coming soon.</div>}
        {tab === 3 && <div style={{ color: '#F1A501' }}>Documents coming soon.</div>}
        {tab === 4 && <div style={{ color: '#F1A501' }}>Ask coming soon.</div>}
      </Box>
    </Box>
  )
}

export default App
