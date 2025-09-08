import { createTheme } from '@mui/material/styles'

const noirBlack = '#000000'
const noirRed = '#B30700'
const noirYellow = '#F1A501'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: noirRed },
    secondary: { main: noirYellow },
    background: { default: noirBlack, paper: '#111111' },
    text: { primary: noirYellow },
  },
  typography: {
    fontFamily: 'Century Gothic, Arial, sans-serif',
    h1: { color: noirRed, fontFamily: 'Special Elite, serif' },
    h2: { color: noirRed, fontFamily: 'Special Elite, serif' },
    h3: { color: noirRed, fontFamily: 'Special Elite, serif' },
    h4: { color: noirRed, fontFamily: 'Special Elite, serif' },
    h5: { color: noirRed, fontFamily: 'Special Elite, serif' },
    h6: { color: noirRed, fontFamily: 'Special Elite, serif' },
  },
  components: {
    MuiAppBar: {
      styleOverrides: { root: { backgroundColor: noirBlack, borderBottom: `1px solid ${noirRed}` } },
    },
    MuiButton: {
      styleOverrides: {
        root: { color: noirYellow, borderColor: noirRed },
      },
      defaultProps: { variant: 'outlined' },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundColor: '#111111', border: `1px solid ${noirRed}` } },
    },
    MuiTab: {
      styleOverrides: { root: { color: noirYellow } },
    },
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: noirYellow } },
    },
    MuiInputBase: {
      styleOverrides: { input: { color: noirYellow } },
    },
    MuiFormLabel: {
      styleOverrides: { root: { color: noirYellow } },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiToggleButton: {
      styleOverrides: { root: { color: noirYellow, borderColor: noirRed } },
    },
  },
})

export default theme


