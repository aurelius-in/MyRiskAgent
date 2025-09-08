import React from 'react'
import { AppBar, Box, CssBaseline, Tab, Tabs, Toolbar, Typography } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query'
import Overview from './pages/Overview'
import Documents from './pages/Documents'
import Scores from './pages/Scores'
import Ask from './pages/Ask'
import NavLogo from './components/NavLogo'

function a11yProps(index: number) {
  return {
    id: `mra-tab-${index}`,
    'aria-controls': `mra-tabpanel-${index}`,
  }
}

const App: React.FC = () => {
  const [tab, setTab] = React.useState(0)

  return (
    <QueryClientProvider client={queryClient}>
      <Box sx={{ bgcolor: 'black', minHeight: '100vh' }}>
        <CssBaseline />
        <AppBar position="static" sx={{ bgcolor: '#000000', borderBottom: '1px solid #B30700' }}>
          <Toolbar>
            <NavLogo />
            <Typography
              variant="h6"
              sx={{ flexGrow: 1, color: '#F1A501', fontFamily: 'Special Elite, serif', ml: 1 }}
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
          {tab === 1 && <Scores />}
          {tab === 2 && <div style={{ color: '#F1A501' }}>Drivers coming soon.</div>}
          {tab === 3 && <Documents />}
          {tab === 4 && <Ask />}
        </Box>
      </Box>
    </QueryClientProvider>
  )
}

export default App
